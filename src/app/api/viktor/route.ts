import { NextResponse } from "next/server";

import { runViktor } from "@/lib/viktor/engine";

export async function POST(request: Request) {
  let task = "";
  try {
    const body = await request.json();
    task = typeof body?.task === "string" ? body.task : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!task.trim()) {
    return NextResponse.json({ error: "Task is required" }, { status: 400 });
  }

  // Simulate the time an AI employee spends doing real work.
  await new Promise((r) => setTimeout(r, 650));

  const result = runViktor(task);
  return NextResponse.json(result);
}
