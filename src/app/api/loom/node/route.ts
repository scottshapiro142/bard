import { NextResponse } from "next/server";

import { executeNode, type ExecuteInput } from "@/lib/loom/engine";

/** Reviews take different amounts of time. Stable per node so runs look alike. */
function thinkingTime(nodeId: string): number {
  if (nodeId === "checker") return 1300;
  if (nodeId === "summary") return 1000;
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) % 1000;
  }
  return 700 + hash;
}

export async function POST(request: Request) {
  let body: Partial<ExecuteInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nodeId = typeof body.nodeId === "string" ? body.nodeId : "";
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  await new Promise((r) => setTimeout(r, thinkingTime(nodeId)));

  const result = executeNode({
    nodeId,
    answers: body.answers ?? {},
    leafIds: body.leafIds ?? [],
    deps: body.deps ?? {},
  });

  return NextResponse.json(result);
}
