"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Check, Copy, Download, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Severity } from "@/lib/loom/types";

const SEVERITY_VARIANT: Record<Severity, "destructive" | "warning" | "secondary"> =
  {
    critical: "destructive",
    medium: "warning",
    low: "secondary",
  };

export default function SpecPage() {
  const params = useParams<{ id: string }>();
  const { getProject } = useLoom();
  const project = getProject(params.id);
  const [active, setActive] = React.useState("summary");
  const [copied, setCopied] = React.useState(false);

  const graph = project?.graph;
  const run = project?.run;
  if (!project || !graph || !run?.finishedAt) return null;

  const files = [...graph.nodes]
    .sort((a, b) => {
      const order = { summary: 0, checker: 1, leaf: 2 } as const;
      return order[a.kind] - order[b.kind];
    })
    .filter((node) => run.nodes[node.id]?.result);

  const activeNode = graph.nodes.find((n) => n.id === active) ?? graph.nodes[0];
  const activeResult = run.nodes[activeNode.id]?.result;
  const summaryFindings = run.nodes.summary?.result?.findings ?? [];

  const counts = {
    critical: summaryFindings.filter((f) => f.severity === "critical").length,
    medium: summaryFindings.filter((f) => f.severity === "medium").length,
    low: summaryFindings.filter((f) => f.severity === "low").length,
  };

  const copy = async () => {
    if (!activeResult) return;
    try {
      await navigator.clipboard.writeText(activeResult.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — the text is still selectable
    }
  };

  const download = () => {
    if (!activeResult) return;
    const blob = new Blob([activeResult.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeNode.output;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["critical", "medium", "low"] as Severity[]).map((severity) =>
            counts[severity] > 0 ? (
              <Badge key={severity} variant={SEVERITY_VARIANT[severity]}>
                {counts[severity]} {severity}
              </Badge>
            ) : null
          )}
          <span className="text-xs text-muted-foreground">
            from {files.length} files ·{" "}
            {graph.nodes.filter((n) => n.kind === "leaf").length} parallel
            reviews
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Files
          </h2>
          <ul className="space-y-0.5">
            {files.map((node) => {
              const findings = run.nodes[node.id]?.result?.findings.length ?? 0;
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => setActive(node.id)}
                    data-testid={`file-${node.id}`}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active === node.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {node.output}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums opacity-60">
                      {findings}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {activeNode.output}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
              className="ml-auto h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={download}
              className="h-7 gap-1.5 text-xs"
            >
              <Download className="size-3.5" /> Download
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {activeResult ? (
                <Markdown source={activeResult.markdown} />
              ) : (
                <p className="text-sm text-muted-foreground">No output.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
