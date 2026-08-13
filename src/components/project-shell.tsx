"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  MessagesSquare,
  Network,
  Play,
  FileText,
  Hammer,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LoomWordmark } from "@/components/loom-logo";
import { Button } from "@/components/ui/button";
import type { Project, Stage } from "@/lib/loom/types";

const STAGES: {
  key: Stage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "interview", label: "Interview", icon: MessagesSquare },
  { key: "graph", label: "Graph", icon: Network },
  { key: "run", label: "Run", icon: Play },
  { key: "spec", label: "Spec", icon: FileText },
  { key: "build", label: "Build", icon: Hammer },
];

function stageAvailable(stage: Stage, project: Project): boolean {
  if (stage === "interview") return true;
  if (stage === "graph") return project.interviewComplete && !!project.graph;
  if (stage === "run") return project.interviewComplete && !!project.graph;
  // Spec and Build both need a finished run behind them.
  return !!project.run?.finishedAt;
}

function stageComplete(stage: Stage, project: Project): boolean {
  if (stage === "interview") return project.interviewComplete;
  if (stage === "graph") return !!project.graph && !!project.run;
  if (stage === "run") return !!project.run?.finishedAt;
  if (stage === "spec") return Object.keys(project.taskStatus).length > 0;
  return false;
}

export function ProjectShell({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = (pathname.split("/").pop() ?? "interview") as Stage;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <LoomWordmark />
          </Link>
          <span className="hidden truncate text-sm text-muted-foreground sm:block">
            {project.name}
          </span>
          <Button asChild variant="ghost" size="sm" className="ml-auto shrink-0">
            <Link href="/">All projects</Link>
          </Button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
          {STAGES.map((stage) => {
            const available = stageAvailable(stage.key, project);
            const done = stageComplete(stage.key, project);
            const active = current === stage.key;
            const className = cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
              available && !active && "hover:text-foreground",
              !available && "pointer-events-none opacity-40"
            );

            const content = (
              <>
                {done && !active ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <stage.icon className="size-4" />
                )}
                {stage.label}
              </>
            );

            return available ? (
              <Link
                key={stage.key}
                href={`/p/${project.id}/${stage.key}`}
                className={className}
                data-stage={stage.key}
              >
                {content}
              </Link>
            ) : (
              <span key={stage.key} className={className} aria-disabled>
                {content}
              </span>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
