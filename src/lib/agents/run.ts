import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import {
  getBrain,
  logDecision,
  search,
} from "@/lib/brain/store";
import { AREAS, activeDecisions, type Agent, type Area } from "@/lib/brain/types";

/**
 * Running a real Claude session as one of the project's agents.
 *
 * The brain is handed over as tools rather than an HTTP address, for three
 * reasons: the session can't get the port wrong, the scope check runs against
 * the agent we actually spawned rather than a token it could mislay, and the
 * session needs no filesystem or network access at all to do its job.
 */

export type AgentEvent =
  | { type: "started"; agent: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; summary: string }
  | { type: "said"; text: string }
  | { type: "done"; cost: number; turns: number }
  | { type: "failed"; message: string };

function brainTools(projectId: string, agent: Agent) {
  const read = tool(
    "brain_read",
    "Find out what has already been decided about this app, and why. Always check here before deciding anything — someone may have settled it already.",
    {
      about: z
        .string()
        .optional()
        .describe(
          "What you want to know about, e.g. 'ownership' or 'empty states'. Leave it out to see everything."
        ),
    },
    async ({ about }) => {
      const brain = getBrain(projectId);
      if (!brain) {
        return {
          content: [{ type: "text" as const, text: "No brain for this project." }],
        };
      }
      const found = about ? search(brain, about) : activeDecisions(brain);
      if (found.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Nothing has been decided about "${about}". Treat it as open — say so rather than assuming.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: found
              .map(
                (d) =>
                  `${d.subject} [${d.area}, decided by ${d.madeBy === "human" ? "the designer" : "an agent"}]\n  ${d.statement}\n  Why: ${d.why}`
              )
              .join("\n\n"),
          },
        ],
      };
    }
  );

  const log = tool(
    "brain_log",
    "Record something you decided, so the next agent doesn't undo it. Contradicting a settled decision is refused and goes to the designer instead.",
    {
      subject: z
        .string()
        .describe(
          "A stable key for the thing decided, like 'shoot.ownership' or 'visual.spacing'. Reuse the existing key if you're revising something."
        ),
      area: z
        .enum(["product", "ux", "visual", "data", "technical"])
        .describe("Which part of the app this belongs to."),
      statement: z.string().describe("What you decided, in one or two sentences."),
      why: z
        .string()
        .describe(
          "The reasoning. Required — a decision without it gets re-litigated by whoever comes next."
        ),
    },
    async ({ subject, area, statement, why }) => {
      const brain = getBrain(projectId);
      if (!brain) {
        return { content: [{ type: "text" as const, text: "No brain for this project." }] };
      }
      if (!agent.scopes.includes(area as Area)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Refused: you're approved for ${agent.scopes.join(", ")}, not ${area}. Say what you'd have decided instead, and the designer can take it from there.`,
            },
          ],
        };
      }

      const result = logDecision(brain, agent, {
        subject,
        area: area as Area,
        statement,
        why,
      });

      if (result.outcome === "standoff") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Not recorded — this contradicts something already settled:\n\n  ${result.standoff?.existing.statement}\n  Why: ${result.standoff?.existing.why}\n\nIt's gone to the designer to decide. Carry on with the rest.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text:
              result.outcome === "unchanged"
                ? `Already on the record, unchanged.`
                : `Recorded: ${subject}`,
          },
        ],
      };
    }
  );

  return createSdkMcpServer({
    name: "brain",
    version: "1.0.0",
    instructions:
      "The shared memory for this app. Read it before you decide anything; log what you decide.",
    tools: [read, log],
  });
}

function systemPromptFor(agent: Agent, projectName: string) {
  const areas = agent.scopes
    .map((s) => AREAS.find((a) => a.value === s))
    .filter(Boolean)
    .map((a) => `- ${a!.label}: ${a!.plain}`)
    .join("\n");

  return `You are the ${agent.name} on "${projectName}".${agent.role ? ` ${agent.role}.` : ""}

Several agents work on this app and they don't all exist at the same time. The
brain is how you avoid undoing someone else's work.

How to work:
1. Read the brain first. Always. Something you're about to decide may already be
   settled, and re-deciding it is the specific failure this setup exists to stop.
2. Do the thinking you were asked to do.
3. Log what you decided, with the reasoning. Without the reasoning the next agent
   along will just argue with it.

You may only log decisions in these areas:
${areas}

If you reach something outside them, don't work around it — say what you'd have
decided and leave it to the designer.

Be specific and brief. Say what you decided and why, not what you might do.
Where the brain says something is open, treat it as genuinely open rather than
assuming an answer.`;
}

export async function* runAgent(input: {
  projectId: string;
  projectName: string;
  agent: Agent;
  task: string;
  model?: string;
}): AsyncGenerator<AgentEvent> {
  const { projectId, projectName, agent, task } = input;

  yield { type: "started", agent: agent.name };

  try {
    for await (const message of query({
      prompt: task,
      options: {
        model: input.model ?? "sonnet",
        maxTurns: 12,
        systemPrompt: systemPromptFor(agent, projectName),
        mcpServers: { brain: brainTools(projectId, agent) },
        // The brain and nothing else. No filesystem, no shell, no network.
        allowedTools: ["mcp__brain__brain_read", "mcp__brain__brain_log"],
      },
    })) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            yield { type: "said", text: block.text };
          }
          if (block.type === "tool_use") {
            const args = block.input as Record<string, unknown>;
            yield {
              type: "tool",
              name: String(block.name).replace("mcp__brain__brain_", ""),
              summary:
                typeof args.about === "string"
                  ? `looked up "${args.about}"`
                  : typeof args.subject === "string"
                    ? `logged ${args.subject}`
                    : "read the brain",
            };
          }
        }
      }

      if (message.type === "result") {
        if (message.subtype === "success") {
          yield {
            type: "done",
            cost: message.total_cost_usd ?? 0,
            turns: message.num_turns ?? 0,
          };
        } else {
          yield { type: "failed", message: `Session ended: ${message.subtype}` };
        }
      }
    }
  } catch (error) {
    yield {
      type: "failed",
      message:
        error instanceof Error
          ? error.message
          : "The session couldn't start. Check that Claude Code is installed and signed in.",
    };
  }
}
