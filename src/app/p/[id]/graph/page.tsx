"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { toYaml } from "@/lib/loom/yaml";
import { GraphCanvas } from "@/components/graph-canvas";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function GraphPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getProject } = useLoom();
  const project = getProject(params.id);
  const [selected, setSelected] = React.useState<string | null>(null);

  if (!project?.graph) return null;
  const graph = project.graph;
  const leaves = graph.nodes.filter((n) => n.kind === "leaf");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            The graph
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {`${leaves.length} reviews that don't know about each other, one checker that reads all of them, one summary that ranks what's left. Edit an interview answer and this recompiles.`}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => router.push(`/p/${project.id}/run`)}
          className="gap-2"
          data-testid="go-to-run"
        >
          <Play className="size-4" />
          Run the graph
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <GraphCanvas
            graph={graph}
            className="mx-auto max-w-3xl"
            selected={selected}
            onSelect={(id) => setSelected(id === selected ? null : id)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Nodes
          </h2>
          <ul className="space-y-2">
            {graph.nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(node.id === selected ? null : node.id)
                  }
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    selected === node.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40 hover:bg-accent/30"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-sm text-primary">
                      {node.id}
                    </code>
                    {node.kind !== "leaf" ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {node.kind}
                      </Badge>
                    ) : null}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {node.output}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {node.task}
                  </p>
                  {node.dependsOn.length > 0 ? (
                    <p className="mt-2 font-mono text-xs text-muted-foreground/70">
                      depends_on: [{node.dependsOn.join(", ")}]
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Workflow file
          </h2>
          <CodeBlock
            code={toYaml(graph)}
            filename={`${graph.workflow}.yaml`}
            maxHeight="34rem"
          />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Same format as the code review workflow this borrows from. Copy it
            and run it anywhere that speaks this shape.
          </p>
        </div>
      </div>
    </div>
  );
}
