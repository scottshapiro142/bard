import path from "node:path";

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

import type { BuildEvent } from "./events";
import type { PreparedBuild } from "./pipeline";

/**
 * A real Claude session that finishes the app.
 *
 * The scaffold stops wherever a review found an open question. This session
 * works inside the built project and closes the gaps it safely can — the
 * mechanical ones, and the build errors — while leaving anything that's a
 * genuine product decision as a marked TODO for the designer.
 *
 * It gets real file and shell tools, but only inside the build folder: the
 * `canUseTool` guard denies any write or command that reaches outside it, and
 * denies the handful of commands that could do damage.
 */

const FILE_TOOLS = new Set(["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep"]);

/**
 * Commands with no place in this build, refused outright: anything dangerous,
 * and anything that touches the dependency tree — it's provided, pinned, and
 * shared by hardlink, so an install or a wipe only breaks things.
 */
const FORBIDDEN =
  /\b(sudo|rm\s+-rf\s+\/|curl|wget|ssh|scp|git\s+push|npm\s+publish|shutdown|reboot|mkfs|dd\s+if=)|(npm|pnpm|yarn)\s+(install|ci|add|i\b)|node_modules/;

function guard(dir: string) {
  const root = path.resolve(dir);
  const inside = (p: unknown): boolean => {
    if (typeof p !== "string" || !p) return false;
    const resolved = path.isAbsolute(p) ? path.resolve(p) : path.resolve(root, p);
    return resolved === root || resolved.startsWith(root + path.sep);
  };

  return async (
    toolName: string,
    input: Record<string, unknown>
  ): Promise<PermissionResult> => {
    if (FILE_TOOLS.has(toolName)) {
      const target = input.file_path ?? input.path ?? input.notebook_path;
      // Read-side tools without a path (a bare Glob) are fine; scoped by cwd.
      if (target === undefined) return { behavior: "allow", updatedInput: input };
      if (inside(target)) return { behavior: "allow", updatedInput: input };
      return { behavior: "deny", message: `That path is outside the build folder.` };
    }

    if (toolName === "Bash") {
      const command = String(input.command ?? "");
      if (FORBIDDEN.test(command)) {
        return { behavior: "deny", message: "That command isn't allowed in a build." };
      }
      // Keep the session in its folder: any absolute path it names must be
      // inside the build root. Relative paths run against cwd, which already is.
      const absPaths = command.match(/\/[^\s'"|;&()]+/g) ?? [];
      for (const token of absPaths) {
        if (token.startsWith("/dev/") || token.startsWith("/proc/")) continue;
        if (!inside(token)) {
          return {
            behavior: "deny",
            message: `Work inside the build folder only — ${token} is outside it.`,
          };
        }
      }
      return { behavior: "allow", updatedInput: input };
    }

    // Anything else (there shouldn't be much) is denied by default.
    return { behavior: "deny", message: `${toolName} isn't available here.` };
  };
}

function openWork(prepared: PreparedBuild): string {
  // The tasks the reviews raised that a machine can act on without inventing a
  // product decision. Decisions (the "decide" milestone) are left to the human.
  const actionable = prepared.tasks
    .filter((t) => t.kind !== "decide" && t.milestone !== "decide")
    .slice(0, 14)
    .map((t) => `- ${t.plain.what} (${t.plain.done})`)
    .join("\n");
  return actionable || "- Nothing specific; just make the build clean.";
}

function promptFor(input: BuildAgentInput): string {
  const { dir, prepared, buildOk, buildLog } = input;
  const tail = buildLog.split("\n").slice(-60).join("\n");

  return `You are finishing a Next.js 16 (App Router, Turbopack) app that was
generated for this brief:

  ${prepared.brief.product}

The project is on disk at:

  ${dir}

Rules that don't bend:
- Work only inside that folder. Never create or touch files elsewhere.
- Never change the build tooling. \`npm run build\` is the command; don't switch
  to webpack, don't edit next.config, don't touch tsconfig strictness.
- Keep every change small, typed and idiomatic. Never delete a screen or weaken
  a type to make an error disappear.

${
  buildOk
    ? `The build already passes. Do not try to "fix" it — your job is only to close the mechanical gaps below, then run \`npm run build\` ONCE at the end to confirm it still passes.`
    : `The build is failing. Read the error at the bottom, fix the cause, and run \`npm run build\` until it passes.`
}

Then, and only for the mechanical ones, resolve the \`TODO(loom)\` comments:
wiring, obvious missing pieces, list rendering, small states. A \`TODO(loom)\`
that is a real product decision — how deletion behaves, who may see what,
pricing — you LEAVE exactly as it is. Nobody but the designer decides those.

Open work the reviews raised (only do the mechanical parts):
${openWork(prepared)}

${buildOk ? "" : `The tail of the failing build:\n\n${tail}\n`}
Be economical with your turns. When done, say in two or three sentences what you
changed and what you deliberately left for the designer to decide.`;
}

const SYSTEM = `You are a careful build engineer. You are handed a freshly
generated app and asked to make it build cleanly and fill in the mechanical
gaps — nothing more. You prefer the smallest change that works, you keep the
code typed and idiomatic for Next.js App Router, and you never paper over a real
product decision. When something is genuinely the designer's call, you leave the
existing TODO comment exactly where it is rather than guessing.`;

export interface BuildAgentInput {
  dir: string;
  prepared: PreparedBuild;
  model?: string;
  buildOk: boolean;
  buildLog: string;
}

export async function runBuildAgent(
  input: BuildAgentInput,
  onEvent: (event: BuildEvent) => void
): Promise<{ cost: number }> {
  let cost = 0;

  try {
    for await (const message of query({
      prompt: promptFor(input),
      options: {
        model: input.model ?? "sonnet",
        cwd: input.dir,
        maxTurns: 40,
        systemPrompt: SYSTEM,
        // Real tools, but only these, and only inside the build folder.
        allowedTools: ["Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", "Bash"],
        canUseTool: guard(input.dir),
        // Don't pull in this repo's CLAUDE.md / settings — the session should
        // see only the generated project it's standing in.
        settingSources: [],
        // The host is a dev server, so its NODE_ENV is "development"; force
        // production so the session's own `npm run build` behaves exactly like
        // the verifier's, rather than sending it chasing a phantom failure.
        env: { ...process.env, NODE_ENV: "production" } as Record<string, string>,
      },
    })) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            onEvent({ type: "agent-said", text: block.text });
          }
          if (block.type === "tool_use") {
            onEvent({
              type: "agent-tool",
              name: String(block.name),
              summary: summarize(block.name, block.input as Record<string, unknown>),
            });
          }
        }
      }
      if (message.type === "result") {
        // Cost is reported on every terminal result, success or not.
        cost = message.total_cost_usd ?? cost;
        if (message.subtype !== "success") {
          onEvent({ type: "log", text: `Session ended: ${message.subtype}`, stream: "agent" });
        }
      }
    }
  } catch (error) {
    onEvent({
      type: "log",
      text:
        error instanceof Error
          ? `Agent error: ${error.message}`
          : "The build session couldn't run.",
      stream: "agent",
    });
  }

  return { cost };
}

function summarize(name: string, input: Record<string, unknown>): string {
  const rel = (p: unknown) =>
    typeof p === "string" ? p.split("/").slice(-2).join("/") : "";
  switch (name) {
    case "Read":
      return `read ${rel(input.file_path)}`;
    case "Write":
      return `wrote ${rel(input.file_path)}`;
    case "Edit":
    case "MultiEdit":
      return `edited ${rel(input.file_path)}`;
    case "Bash":
      return String(input.command ?? "").slice(0, 60);
    case "Glob":
    case "Grep":
      return `searched ${String(input.pattern ?? "")}`.slice(0, 60);
    default:
      return name;
  }
}
