import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";

import { buildDirFor } from "@/lib/build/materialize";

/**
 * Download the built project as a zip — the same files that were just verified,
 * minus the borrowed `node_modules` and the build output. Unzip, `npm install`,
 * `npm run dev`, and it's the app that built here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  if (!projectId) {
    return Response.json({ error: "Which project?" }, { status: 400 });
  }

  const dir = buildDirFor(projectId);
  const exists = await fs.stat(dir).catch(() => null);
  if (!exists) {
    return Response.json(
      { error: "Nothing built yet — build it first, then download." },
      { status: 404 }
    );
  }

  const zip = await new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      "zip",
      ["-r", "-q", "-", ".", "-x", "node_modules/*", ".next/*"],
      { cwd: dir }
    );
    const chunks: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (b: Buffer) => chunks.push(b));
    child.stderr.on("data", (b: Buffer) => (err += b.toString()));
    child.on("close", (code) =>
      // zip exits 12 when there's nothing to do; anything non-zero with no bytes
      // is a real failure.
      chunks.length > 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(err || `zip exited ${code}`))
    );
    child.on("error", reject);
  }).catch((e) => e as Error);

  if (zip instanceof Error) {
    return Response.json({ error: zip.message }, { status: 500 });
  }

  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "app";
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safe}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
