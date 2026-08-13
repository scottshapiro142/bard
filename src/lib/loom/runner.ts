import { executeNode } from "./engine";
import type {
  Answers,
  Graph,
  LogLine,
  NodeResult,
  RunState,
} from "./types";

function emptyRun(graph: Graph): RunState {
  const nodes: RunState["nodes"] = {};
  for (const node of graph.nodes) {
    nodes[node.id] = {
      status: node.dependsOn.length > 0 ? "blocked" : "pending",
    };
  }
  return { startedAt: Date.now(), nodes, log: [] };
}

function log(state: RunState, line: Omit<LogLine, "at">) {
  state.log = [...state.log, { ...line, at: Date.now() }];
}

async function callNode(body: {
  nodeId: string;
  answers: Answers;
  leafIds: string[];
  deps: Record<string, NodeResult>;
}): Promise<NodeResult> {
  const res = await fetch("/api/loom/node", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`node ${body.nodeId} failed`);
  return (await res.json()) as NodeResult;
}

/**
 * Execute the graph. Every node starts the moment its dependencies finish, so
 * the independent reviews genuinely run at the same time — the checker is the
 * only thing waiting on all of them.
 */
export async function runGraph(
  graph: Graph,
  answers: Answers,
  onEvent: (state: RunState) => void
): Promise<RunState> {
  const state = emptyRun(graph);
  const leafIds = graph.nodes.filter((n) => n.kind === "leaf").map((n) => n.id);
  const emit = () => onEvent({ ...state, nodes: { ...state.nodes } });

  log(state, {
    node: "graph",
    level: "info",
    message: `${graph.nodes.length} nodes · ${leafIds.length} running in parallel`,
  });
  emit();

  const inflight = new Map<string, Promise<NodeResult>>();

  const run = (id: string): Promise<NodeResult> => {
    const existing = inflight.get(id);
    if (existing) return existing;

    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return Promise.reject(new Error(`unknown node ${id}`));

    const promise = (async () => {
      const depResults = await Promise.all(node.dependsOn.map(run));
      const deps: Record<string, NodeResult> = {};
      node.dependsOn.forEach((depId, i) => {
        deps[depId] = depResults[i];
      });

      state.nodes[id] = { status: "running", startedAt: Date.now() };
      log(state, { node: id, level: "start", message: "running" });
      emit();

      let result: NodeResult;
      try {
        result = await callNode({ nodeId: id, answers, leafIds, deps });
      } catch {
        // The engine is pure, so falling back to running it here is equivalent.
        result = executeNode({ nodeId: id, answers, leafIds, deps });
      }

      const startedAt = state.nodes[id].startedAt;
      state.nodes[id] = {
        status: "done",
        startedAt,
        finishedAt: Date.now(),
        result,
      };
      log(state, {
        node: id,
        level: "done",
        message: `wrote ${node.output} · ${result.findings.length} findings`,
      });
      emit();

      return result;
    })();

    inflight.set(id, promise);
    return promise;
  };

  await Promise.all(graph.nodes.map((n) => run(n.id)));

  state.finishedAt = Date.now();
  log(state, {
    node: "graph",
    level: "info",
    message: `complete in ${((state.finishedAt - state.startedAt) / 1000).toFixed(1)}s`,
  });
  emit();

  return state;
}

export function runProgress(state: RunState | null, graph: Graph | null): number {
  if (!state || !graph) return 0;
  const done = graph.nodes.filter(
    (n) => state.nodes[n.id]?.status === "done"
  ).length;
  return graph.nodes.length === 0 ? 0 : done / graph.nodes.length;
}
