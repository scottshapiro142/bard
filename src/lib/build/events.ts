/** The stream a build sends back to the browser, one JSON object per line. */
export type BuildEvent =
  | { type: "stage"; stage: BuildStage; text: string }
  | { type: "file"; path: string }
  | { type: "log"; text: string; stream?: "build" | "agent" }
  | { type: "agent-tool"; name: string; summary: string }
  | { type: "agent-said"; text: string }
  | { type: "verified"; ok: boolean; text: string }
  | { type: "done"; ok: boolean; dir: string; fileCount: number; cost?: number }
  | { type: "failed"; message: string };

export type BuildStage =
  | "prepare"
  | "materialize"
  | "verify"
  | "agent"
  | "reverify";

export const STAGE_LABEL: Record<BuildStage, string> = {
  prepare: "Working out what to build",
  materialize: "Writing the project to disk",
  verify: "Building it for real",
  agent: "A Claude session fills in what was left open",
  reverify: "Building it again to prove it still stands",
};
