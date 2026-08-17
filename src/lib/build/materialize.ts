import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ScaffoldFile } from "../loom/types";

/**
 * Turning the assembled project into files on disk and actually building it.
 *
 * Server-only — it writes files and spawns `next build`. Two things make the
 * build fast enough to run inside a request: it lands in the OS temp dir (so
 * Next's own dev server never sees it and never recompiles), and it borrows
 * this workspace's already-installed `node_modules` by symlink rather than
 * running a fresh install of Next.
 */

export interface BuildStep {
  kind: "info" | "command" | "output" | "ok" | "error";
  text: string;
}

export interface MaterializeResult {
  dir: string;
  fileCount: number;
}

const ROOT = process.cwd();

function buildsRoot() {
  return path.join(os.tmpdir(), "loom-builds");
}

export function buildDirFor(projectId: string): string {
  // A stable, filesystem-safe folder per project, so rebuilding reuses it.
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(buildsRoot(), safe || "app");
}

/** Write every file, making parent folders as needed. Overwrites cleanly. */
export async function materialize(
  projectId: string,
  files: ScaffoldFile[]
): Promise<MaterializeResult> {
  const dir = buildDirFor(projectId);

  // Start from a clean app tree, but keep node_modules/.next if they're there
  // so a rebuild doesn't pay for the link and the Next cache again.
  await removeExcept(dir, new Set(["node_modules", ".next"]));
  await fs.mkdir(dir, { recursive: true });

  for (const file of files) {
    const full = path.join(dir, file.path);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.contents, "utf8");
  }

  await linkToolchain(dir);

  return { dir, fileCount: files.length };
}

/** Remove everything in dir except the named top-level entries. No-op if new. */
async function removeExcept(dir: string, keep: Set<string>) {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => !keep.has(name))
      .map((name) => fs.rm(path.join(dir, name), { recursive: true, force: true }))
  );
}

/**
 * Point the build at this workspace's dependencies instead of installing its
 * own. The assembled package.json pins the same versions, so what builds here
 * is what `npm install` will reproduce on the designer's machine.
 *
 * A hardlink clone rather than a symlink: Turbopack refuses to follow a
 * `node_modules` symlink that leaves the project root, but a real directory of
 * hardlinks costs almost nothing on one filesystem and builds with the exact
 * command the download will run.
 */
async function linkToolchain(dir: string) {
  const target = path.join(dir, "node_modules");
  const source = path.join(ROOT, "node_modules");

  const existing = await fs.lstat(target).catch(() => null);
  if (existing?.isDirectory() && !existing.isSymbolicLink()) return; // already cloned
  if (existing) await fs.rm(target, { recursive: true, force: true });

  // `cp -al` hardlinks every regular file and copies the (relative) symlinks in
  // .bin as-is. Orders of magnitude faster than an install, and shares inodes.
  await new Promise<void>((resolve, reject) => {
    const child = spawn("cp", ["-al", source, target]);
    let err = "";
    child.stderr.on("data", (b) => (err += b.toString()));
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`cp -al node_modules failed: ${err}`))
    );
    child.on("error", reject);
  });
}

export interface RunBuildResult {
  ok: boolean;
  code: number | null;
  output: string;
}

/**
 * Run a command in the build dir, streaming each line back through `onStep`.
 * Used for `next build` and for the typecheck.
 */
export function runCommand(
  dir: string,
  command: string,
  args: string[],
  onStep: (step: BuildStep) => void,
  timeoutMs = 240_000
): Promise<RunBuildResult> {
  return new Promise((resolve) => {
    onStep({ kind: "command", text: `${command} ${args.join(" ")}` });

    const child = spawn(command, args, {
      cwd: dir,
      env: {
        ...process.env,
        // Next prints cleaner, machine-readable-ish output without the spinner.
        CI: "1",
        NEXT_TELEMETRY_DISABLED: "1",
        // The dev server that hosts this runs in development; the generated app
        // must build as production or Next warns and behaves inconsistently.
        NODE_ENV: "production",
      },
    });

    let output = "";
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      output += text;
      for (const line of text.split("\n")) {
        if (line.trim()) onStep({ kind: "output", text: line.replace(/\s+$/, "") });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      onStep({ kind: "error", text: `Timed out after ${timeoutMs / 1000}s` });
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, output });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      onStep({ kind: "error", text: err.message });
      resolve({ ok: false, code: null, output });
    });
  });
}

/** The whole verify: build the app, and report whether it stands up. */
export async function buildProject(
  dir: string,
  onStep: (step: BuildStep) => void
): Promise<RunBuildResult> {
  const next = path.join(dir, "node_modules", ".bin", "next");
  return runCommand(dir, next, ["build"], onStep);
}
