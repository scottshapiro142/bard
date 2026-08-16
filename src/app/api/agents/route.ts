import { getBrain } from "@/lib/brain/store";
import { runAgent } from "@/lib/agents/run";

/** Spawning a Claude session takes minutes, not milliseconds. */
export const maxDuration = 300;

/**
 * Put an agent to work.
 *
 * Streams newline-delimited JSON so the designer can watch it think rather than
 * staring at a spinner — seeing which decisions it looked up is most of the
 * value of running it at all.
 */
export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = String(input.projectId ?? "");
  const agentId = String(input.agentId ?? "");
  const task = String(input.task ?? "").trim();

  const brain = getBrain(projectId);
  if (!brain) return Response.json({ error: "No brain for that project." }, { status: 404 });

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token !== brain.ownerToken) {
    return Response.json(
      { error: "Only the project owner can put an agent to work." },
      { status: 403 }
    );
  }

  const agent = brain.agents.find((a) => a.id === agentId && !a.revoked);
  if (!agent) return Response.json({ error: "No such agent." }, { status: 404 });
  if (!task) return Response.json({ error: "Give it something to do." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAgent({
          projectId,
          projectName: brain.projectName,
          agent,
          task,
          model: typeof input.model === "string" ? input.model : undefined,
        })) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "failed",
              message: error instanceof Error ? error.message : "Something went wrong.",
            }) + "\n"
          )
        );
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
