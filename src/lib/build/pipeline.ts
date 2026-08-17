import { deriveBrief } from "../loom/brief";
import { compileGraph, leavesOf } from "../loom/compile";
import { deriveAppSpec, type AppSpec } from "../loom/app";
import { executeNode } from "../loom/engine";
import { compileTasks } from "../loom/tasks";
import { buildFeatures } from "../loom/features";
import { generateDocs } from "../loom/docs";
import { assembleProject } from "./project";
import type { Answers, Brief, Finding, NodeResult, ScaffoldFile, Task } from "../loom/types";

/**
 * Everything the build needs, produced from an interview without a browser or
 * the HTTP node-runner. The reviews are pure, so running them here gives the
 * same findings the app shows in its Run stage.
 */
export interface PreparedBuild {
  brief: Brief;
  app: AppSpec;
  findings: Finding[];
  tasks: Task[];
  files: ScaffoldFile[];
}

/** Execute the compiled graph in dependency order and return the spec findings. */
export function runReviews(answers: Answers): Finding[] {
  const graph = compileGraph(answers);
  const leafIds = leavesOf(graph).map((n) => n.id);
  const results: Record<string, NodeResult> = {};

  // The graph is small and its shape is fixed (leaves -> checker -> summary),
  // so a couple of passes settle every node without a real scheduler.
  const pending = new Set(graph.nodes.map((n) => n.id));
  let guard = graph.nodes.length + 2;
  while (pending.size > 0 && guard-- > 0) {
    for (const node of graph.nodes) {
      if (!pending.has(node.id)) continue;
      if (!node.dependsOn.every((d) => results[d])) continue;
      const deps: Record<string, NodeResult> = {};
      for (const d of node.dependsOn) deps[d] = results[d];
      results[node.id] = executeNode({ nodeId: node.id, answers, leafIds, deps });
      pending.delete(node.id);
    }
  }

  return results.summary?.findings ?? [];
}

export interface PrepareInput {
  answers: Answers;
  name: string;
  /** The edited app, when building a real project. Omit to derive from answers. */
  app?: AppSpec;
  designerName?: string;
  decisions?: Record<string, string>;
}

export function prepareBuild(input: PrepareInput): PreparedBuild {
  const brief = deriveBrief(input.answers);
  const app = input.app ?? deriveAppSpec(brief);
  const findings = runReviews(input.answers);
  const tasks = compileTasks(brief, findings, app);
  const features = buildFeatures(app, tasks);
  const graph = compileGraph(input.answers);

  const docs = generateDocs({
    brief,
    app,
    findings,
    tasks,
    features,
    statuses: {},
    feedback: [],
    leafCount: leavesOf(graph).length,
    designerName: input.designerName ?? "",
    decisions: input.decisions ?? {},
  });

  const files = assembleProject({ name: input.name, brief, app, findings, tasks, docs });

  return { brief, app, findings, tasks, files };
}
