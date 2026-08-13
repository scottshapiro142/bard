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

export type Stage = "interview" | "graph" | "run" | "spec";

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
}

export interface LoomState {
  projects: Project[];
}

/** Everything the generators read, normalised once so they stay consistent. */
export interface Brief {
  product: string;
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
