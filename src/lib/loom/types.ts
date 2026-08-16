import type { AppSpec } from "./app";
import type { PlainText } from "./plain";
import type { OpenQuestion } from "./questions";

export type ProductType =
  | "consumer"
  | "internal"
  | "marketplace"
  | "analytics"
  | "content"
  | "devtool";

export type Severity = "critical" | "medium" | "low";

export type QuestionKind = "text" | "textarea" | "choice" | "multi";

export interface Question {
  id: string;
  prompt: string;
  /** The bit that makes a designer answer well instead of vaguely. */
  helper?: string;
  placeholder?: string;
  kind: QuestionKind;
  options?: { value: string; label: string; hint?: string }[];
  optional?: boolean;
  /** Adaptive: only asked when this returns true for the answers so far. */
  when?: (answers: Answers) => boolean;
  /** Which graph node this answer feeds, shown live while interviewing. */
  unlocks?: string;
}

export type Answers = Record<string, string>;

export type NodeKind = "leaf" | "checker" | "summary";

export interface GraphNode {
  id: string;
  /** Human label for the canvas. */
  title: string;
  /** The task prompt, written the way you'd write it by hand. */
  task: string;
  dependsOn: string[];
  output: string;
  kind: NodeKind;
}

export interface Graph {
  workflow: string;
  nodes: GraphNode[];
}

export interface Finding {
  id: string;
  /** Node that raised it. */
  node: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Cross-cutting concerns. Two nodes sharing a tag is what the checker hunts. */
  tags: string[];
  /** Set by the checker when the same tag surfaced in more than one review. */
  alsoIn?: string[];
  /** Set by the checker when it raised the severity, with the reason. */
  raisedFrom?: Severity;
}

export interface NodeResult {
  markdown: string;
  findings: Finding[];
}

export type NodeStatus = "pending" | "blocked" | "running" | "done";

export interface NodeRunState {
  status: NodeStatus;
  startedAt?: number;
  finishedAt?: number;
  result?: NodeResult;
}

export interface RunState {
  startedAt: number;
  finishedAt?: number;
  nodes: Record<string, NodeRunState>;
  log: LogLine[];
}

export interface LogLine {
  at: number;
  node: string;
  message: string;
  level: "info" | "done" | "start";
}

export type Stage = "interview" | "graph" | "run" | "spec" | "build";

export type MilestoneId =
  | "decide"
  | "foundation"
  | "core"
  | "states"
  | "harden";

export type TaskKind = "decide" | "design" | "build" | "review";
export type TaskSize = "S" | "M" | "L";
export type TaskStatus = "todo" | "doing" | "done";

export interface Milestone {
  id: MilestoneId;
  title: string;
  blurb: string;
}

export interface Task {
  id: string;
  title: string;
  /** The reviews' own words. Kept, but never what a designer reads first. */
  detail: string;
  /** What this is, why it matters, and how you'd know it's done. */
  plain: PlainText;
  /** The feature this belongs to, for the review checkpoints. */
  featureId?: string;
  /** For review tasks: which screen to open when they go and try it. */
  previewScreenId?: string;
  /** What Loom needs to know before this can be settled. */
  question?: OpenQuestion;
  milestone: MilestoneId;
  kind: TaskKind;
  size: TaskSize;
  /** A fix the reviews asked for, or a piece of the build itself. */
  source: "finding" | "plan";
  /** Review that raised it, for finding-derived tasks. */
  from?: string;
  severity?: Severity;
  /** Primary concern — what links a task to the decisions that gate it. */
  tag: string;
  blockedBy: string[];
}

/** A file the scaffold generates. */
export interface ScaffoldFile {
  path: string;
  language: "ts" | "tsx" | "md" | "css" | "json";
  /** Why this file looks the way it does, traced back to a review. */
  because: string;
  contents: string;
}

export type CheckpointState =
  | "waiting"
  | "ready"
  | "approved"
  | "changes-requested";

export interface Checkpoint {
  featureId: string;
  state: CheckpointState;
  raisedAt: number;
  respondedAt?: number;
}

/** Something the designer said after trying it, kept in their own words. */
export interface FeedbackNote {
  id: string;
  featureId: string;
  text: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  answers: Answers;
  /** Index into the resolved (adaptive) question list. */
  cursor: number;
  interviewComplete: boolean;
  graph: Graph | null;
  run: RunState | null;
  /** Task id -> status. Absent means todo. */
  taskStatus: Record<string, TaskStatus>;
  /** The editable app. Derived from the brief on first visit to Build. */
  app: AppSpec | null;
  /** What to call the designer in checkpoint messages. */
  designerName: string;
  /** Feature id -> checkpoint. */
  checkpoints: Record<string, Checkpoint>;
  feedback: FeedbackNote[];
  /** Task id -> what the designer answered. This is the app's memory. */
  decisions: Record<string, string>;
  /** Owner token for this project's brain. Minted on first sync. */
  brainToken: string;
}

export interface LoomState {
  projects: Project[];
}

/** Everything the generators read, normalised once so they stay consistent. */
export interface Brief {
  product: string;
  /** The audience answer, verbatim — the docs quote it back. */
  who: string;
  actor: string;
  actorPlural: string;
  job: string;
  type: ProductType;
  typeLabel: string;
  today: string;
  entities: string[];
  worry: string;
  platforms: string[];
  mobile: boolean;
  scale: string;
  production: boolean;
  outOfScope: string;
  extra: Answers;
}
