import { prepareBuild } from "@/lib/build/pipeline";
import { buildProject, materialize } from "@/lib/build/materialize";
import { runBuildAgent } from "@/lib/build/agent";
import type { BuildEvent } from "@/lib/build/events";
import type { AppSpec } from "@/lib/loom/app";
import type { Answers } from "@/lib/loom/types";

/** A real `next build` (and maybe a Claude session) takes minutes. */
export const maxDuration = 800;

/**
 * Actually build the app.
 *
 * Assembles a complete Next.js project from the interview, writes it to disk,
 * builds it for real, and — when asked — hands what's still open to a Claude
 * session that writes the code and proves the build still stands. Streamed as
 * newline-delimited JSON so the designer watches it happen.
 */
export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const answers = (input.answers ?? {}) as Answers;
  const name = String(input.name ?? "app");
  const projectId = String(input.projectId ?? "example");
  const app = input.app as AppSpec | undefined;
  const useAgent = input.agent !== false; // default on
  const model = typeof input.model === "string" ? input.model : undefined;

  if (!answers.product && !app) {
    return Response.json(
      { error: "Nothing to build — finish the interview first." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BuildEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // 1. Work out what to build.
        send({ type: "stage", stage: "prepare", text: "Working out what to build" });
        const prepared = prepareBuild({
          answers,
          name,
          app,
          designerName: String(input.designerName ?? ""),
          decisions: (input.decisions ?? {}) as Record<string, string>,
        });
        for (const file of prepared.files) send({ type: "file", path: file.path });

        // 2. Write it to disk.
        send({
          type: "stage",
          stage: "materialize",
          text: "Writing the project to disk",
        });
        const { dir, fileCount } = await materialize(projectId, prepared.files);
        send({ type: "log", text: `Wrote ${fileCount} files to ${dir}` });

        // 3. Build it for real.
        send({ type: "stage", stage: "verify", text: "Building it for real" });
        let build = await buildProject(dir, (step) => {
          if (step.kind === "output" || step.kind === "command")
            send({ type: "log", text: step.text, stream: "build" });
          if (step.kind === "error") send({ type: "log", text: step.text, stream: "build" });
        });
        send({
          type: "verified",
          ok: build.ok,
          text: build.ok ? "The app builds." : "The build has errors.",
        });

        let cost = 0;

        // 4. Hand what's open to a Claude session, then build again.
        if (useAgent) {
          send({
            type: "stage",
            stage: "agent",
            text: "A Claude session fills in what was left open",
          });
          const agentResult = await runBuildAgent(
            { dir, prepared, model, buildOk: build.ok, buildLog: build.output },
            (event) => send(event)
          );
          cost = agentResult.cost;

          send({
            type: "stage",
            stage: "reverify",
            text: "Building it again to prove it still stands",
          });
          build = await buildProject(dir, (step) => {
            if (step.kind === "output" || step.kind === "command")
              send({ type: "log", text: step.text, stream: "build" });
            if (step.kind === "error") send({ type: "log", text: step.text, stream: "build" });
          });
          send({
            type: "verified",
            ok: build.ok,
            text: build.ok
              ? "Still builds after the changes."
              : "The changes broke the build.",
          });
        }

        send({ type: "done", ok: build.ok, dir, fileCount, cost });
      } catch (error) {
        send({
          type: "failed",
          message: error instanceof Error ? error.message : "Something went wrong.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
