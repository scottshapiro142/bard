"use client";

import * as React from "react";
import {
  CheckCircle2,
  Download,
  Hammer,
  Loader2,
  Terminal,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STAGE_LABEL, type BuildEvent, type BuildStage } from "@/lib/build/events";
import type { AppSpec } from "@/lib/loom/app";
import type { Answers } from "@/lib/loom/types";

type Line = { kind: "log" | "tool" | "said" | "build"; text: string };

const STAGES: BuildStage[] = ["prepare", "materialize", "verify", "agent", "reverify"];

export function ShipPanel({
  projectId,
  name,
  answers,
  app,
  designerName,
  decisions,
}: {
  projectId: string;
  name: string;
  answers: Answers;
  app: AppSpec;
  designerName: string;
  decisions: Record<string, string>;
}) {
  const [running, setRunning] = React.useState(false);
  const [useAgent, setUseAgent] = React.useState(true);
  const [stage, setStage] = React.useState<BuildStage | null>(null);
  const [reached, setReached] = React.useState<Set<BuildStage>>(new Set());
  const [lines, setLines] = React.useState<Line[]>([]);
  const [verified, setVerified] = React.useState<boolean | null>(null);
  const [done, setDone] = React.useState<null | { ok: boolean; fileCount: number; cost: number }>(null);
  const [error, setError] = React.useState<string | null>(null);
  const logRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const push = (line: Line) =>
    setLines((prev) => [...prev.slice(-400), line]);

  const build = async () => {
    setRunning(true);
    setStage(null);
    setReached(new Set());
    setLines([]);
    setVerified(null);
    setDone(null);
    setError(null);

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          answers,
          app,
          designerName,
          decisions,
          agent: useAgent,
        }),
      });
      if (!res.ok || !res.body) {
        setError((await res.json().catch(() => ({}))).error ?? "Couldn't start the build.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const event = JSON.parse(part) as BuildEvent;
          apply(event);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
      setStage(null);
    }
  };

  const apply = (event: BuildEvent) => {
    switch (event.type) {
      case "stage":
        setStage(event.stage);
        setReached((prev) => new Set(prev).add(event.stage));
        break;
      case "log":
        push({ kind: "build", text: event.text });
        break;
      case "agent-tool":
        push({ kind: "tool", text: `${event.summary}` });
        break;
      case "agent-said":
        push({ kind: "said", text: event.text });
        break;
      case "verified":
        setVerified(event.ok);
        break;
      case "done":
        setDone({ ok: event.ok, fileCount: event.fileCount, cost: event.cost ?? 0 });
        break;
      case "failed":
        setError(event.message);
        break;
    }
  };

  const shownStages = useAgent ? STAGES : STAGES.filter((s) => s !== "agent" && s !== "reverify");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Build the app for real</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          This assembles everything on the left into a complete Next.js project,
          writes it to disk, and runs a real production build to prove it stands
          up. With the finishing pass on, a Claude session then closes the
          mechanical gaps and builds it again — leaving the real decisions, the
          ones marked <code className="text-xs">TODO(loom)</code>, to you.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={build} disabled={running} className="gap-2">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
          {running ? "Building…" : "Build the app"}
        </Button>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={useAgent}
            disabled={running}
            onChange={(e) => setUseAgent(e.target.checked)}
            className="size-4 accent-primary"
          />
          Let a Claude session finish it
        </label>

        {done?.ok ? (
          <Button asChild variant="outline" className="gap-2">
            <a href={`/api/build/download?projectId=${encodeURIComponent(projectId)}`}>
              <Download className="size-4" />
              Download the code
            </a>
          </Button>
        ) : null}
      </div>

      {/* Stage tracker */}
      {(running || reached.size > 0) && !error ? (
        <ol className="space-y-1.5" data-testid="build-stages">
          {shownStages.map((s) => {
            const active = stage === s;
            const done = reached.has(s) && stage !== s;
            return (
              <li key={s} className="flex items-center gap-2 text-sm">
                {active ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border" />
                )}
                <span className={cn(active && "font-medium", !active && !done && "text-muted-foreground")}>
                  {STAGE_LABEL[s]}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-2 py-4 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      {done ? (
        <Card className={cn(done.ok ? "border-emerald-500/40" : "border-destructive/40")}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              {done.ok ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <XCircle className="size-5 text-destructive" />
              )}
              <p className="text-sm font-medium">
                {done.ok
                  ? "Built and verified — the app compiles and runs a clean production build."
                  : "The build didn't pass. The log below has the errors."}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px]">{done.fileCount} files</Badge>
              {done.cost > 0 ? (
                <Badge variant="outline" className="text-[10px]">
                  finishing pass ${done.cost.toFixed(3)}
                </Badge>
              ) : null}
              {verified !== null ? (
                <Badge variant={verified ? "success" : "destructive"} className="text-[10px]">
                  {verified ? "next build ✓" : "next build ✗"}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Live log */}
      {lines.length > 0 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <Terminal className="size-3" />
            What&apos;s happening
          </p>
          <div
            ref={logRef}
            data-testid="build-log"
            className="max-h-72 overflow-y-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed"
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  line.kind === "said" && "my-1 font-sans text-xs text-foreground",
                  line.kind === "tool" && "text-primary",
                  line.kind === "build" && "text-muted-foreground"
                )}
              >
                {line.kind === "tool" ? "· " : line.kind === "said" ? "" : ""}
                {line.text}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
