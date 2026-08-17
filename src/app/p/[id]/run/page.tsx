"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { runGraph } from "@/lib/loom/runner";
import { GraphCanvas } from "@/components/graph-canvas";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RunState } from "@/lib/loom/types";

function elapsed(from: number, to: number) {
  return `${((to - from) / 1000).toFixed(1)}s`;
}

export default function RunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getProject, setRun } = useLoom();
  const project = getProject(params.id);

  const [live, setLive] = React.useState<RunState | null>(null);
  const [running, setRunning] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const started = React.useRef(false);

  const graph = project?.graph ?? null;
  const projectId = project?.id ?? null;
  const answers = project?.answers;
  const existingRun = project?.run ?? null;

  const start = React.useCallback(async () => {
    if (!graph || !projectId || !answers) return;
    setRunning(true);
    setSelected(null);
    setLive(null);
    const final = await runGraph(graph, answers, setLive);
    setRun(projectId, final);
    setRunning(false);
  }, [graph, projectId, answers, setRun]);

  // Arriving here from the graph page with nothing run yet means "go".
  React.useEffect(() => {
    if (started.current || !graph || existingRun) return;
    started.current = true;
    void start();
  }, [graph, existingRun, start]);

  if (!project || !graph) return null;

  const run = live ?? existingRun;
  const done = !running && !!run?.finishedAt;
  const doneCount = graph.nodes.filter(
    (n) => run?.nodes[n.id]?.status === "done"
  ).length;

  const selectedNode = selected ? graph.nodes.find((n) => n.id === selected) : null;
  const selectedResult = selected ? run?.nodes[selected]?.result : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {running ? "Running" : done ? "Run complete" : "Ready to run"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every review starts at the same moment. The checker is the only node
            that has to wait — and waiting is the point, because it&apos;s the
            only one that gets to see all the reviews at once.
          </p>
        </div>
        <div className="flex gap-2">
          {done ? (
            <>
              <Button variant="outline" onClick={start} className="gap-2">
                <RotateCcw className="size-4" />
                Re-run
              </Button>
              <Button
                size="lg"
                onClick={() => router.push(`/p/${project.id}/spec`)}
                className="gap-2"
                data-testid="go-to-spec"
              >
                See the spec
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={start}
              disabled={running}
              className="gap-2"
              data-testid="run-graph"
            >
              <Play className="size-4" />
              {running ? "Running…" : "Run"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <GraphCanvas
            graph={graph}
            run={run}
            className="mx-auto max-w-3xl"
            selected={selected}
            onSelect={(id) =>
              run?.nodes[id]?.status === "done"
                ? setSelected(id === selected ? null : id)
                : undefined
            }
          />
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 text-xs text-muted-foreground">
            <span className="font-mono">
              {doneCount} / {graph.nodes.length} nodes
            </span>
            {run?.finishedAt ? (
              <span className="font-mono">
                {elapsed(run.startedAt, run.finishedAt)}
              </span>
            ) : null}
            {done ? (
              <span>Click any node to read what it wrote.</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Log
          </h2>
          <div className="rounded-xl border bg-card p-3 font-mono text-xs">
            {!run || run.log.length === 0 ? (
              <p className="p-2 text-muted-foreground">Waiting to start…</p>
            ) : (
              <ul className="space-y-1.5" data-testid="run-log">
                {run.log.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className={cn(
                        "shrink-0",
                        line.level === "done"
                          ? "text-emerald-500"
                          : line.level === "start"
                            ? "text-primary"
                            : "text-muted-foreground/60"
                      )}
                    >
                      {line.level === "done"
                        ? "✓"
                        : line.level === "start"
                          ? "▸"
                          : "·"}
                    </span>
                    <span className="min-w-0">
                      <span className="text-foreground/80">{line.node}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        {line.message}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {selectedNode ? selectedNode.output : "Output"}
          </h2>
          <Card>
            <CardContent className="pt-6">
              {selectedResult && selectedNode ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-4">
                    <code className="font-mono text-sm text-primary">
                      {selectedNode.id}
                    </code>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedResult.findings.length} findings
                    </Badge>
                  </div>
                  <Markdown source={selectedResult.markdown} />
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {done
                    ? "Select a node above to read its output."
                    : "Node outputs appear here as each review finishes."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
