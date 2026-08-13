"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Circle, CircleDashed, CircleCheck, Lock, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { deriveBrief } from "@/lib/loom/brief";
import { compileTasks } from "@/lib/loom/tasks";
import {
  MILESTONES,
  NEXT_STATUS,
  blockersOf,
  progressOf,
  statusOf,
  tasksIn,
} from "@/lib/loom/tasks";
import { generateScaffold } from "@/lib/loom/scaffold";
import { CodeBlock } from "@/components/code-block";
import { Inline } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task, TaskStatus } from "@/lib/loom/types";

const STATUS_ICON = {
  todo: CircleDashed,
  doing: Circle,
  done: CircleCheck,
} as const;

const KIND_LABEL = {
  decide: "decision",
  design: "design",
  build: "build",
} as const;

function TaskRow({
  task,
  status,
  blockers,
  onToggle,
}: {
  task: Task;
  status: TaskStatus;
  blockers: Task[];
  onToggle: () => void;
}) {
  const Icon = STATUS_ICON[status];
  const blocked = blockers.length > 0 && status !== "done";

  return (
    <li
      className={cn(
        "group flex gap-3 rounded-xl border p-3 transition-colors",
        status === "done" && "opacity-55",
        status === "doing" && "border-primary/50 bg-primary/5"
      )}
      data-task={task.id}
      data-status={status}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Mark ${task.title} as ${NEXT_STATUS[status]}`}
        className="mt-0.5 shrink-0 self-start"
      >
        <Icon
          className={cn(
            "size-4 transition-colors",
            status === "done"
              ? "text-emerald-500"
              : status === "doing"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
          )}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            status === "done" && "line-through"
          )}
        >
          {task.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          <Inline text={task.detail} />
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {KIND_LABEL[task.kind]}
          </Badge>
          <Badge variant="secondary" className="text-[10px] tabular-nums">
            {task.size}
          </Badge>
          {task.from ? (
            <code className="font-mono text-[10px] text-muted-foreground">
              {task.from}
            </code>
          ) : (
            <span className="text-[10px] text-muted-foreground">plan</span>
          )}
          {blocked ? (
            <span
              className="flex items-center gap-1 text-[10px] text-amber-500"
              title={blockers.map((b) => b.title).join("\n")}
            >
              <Lock className="size-3" />
              {blockers.length === 1
                ? `blocked by ${blockers[0].title}`
                : `blocked by ${blockers.length} tasks`}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function BuildPage() {
  const params = useParams<{ id: string }>();
  const { getProject, setTaskStatus, resetTasks } = useLoom();
  const project = getProject(params.id);
  const [activeFile, setActiveFile] = React.useState(0);

  const findings = project?.run?.nodes.summary?.result?.findings;

  const { tasks, scaffold } = React.useMemo(() => {
    if (!project || !findings) return { tasks: [], scaffold: [] };
    const brief = deriveBrief(project.answers);
    const compiled = compileTasks(brief, findings);
    return {
      tasks: compiled,
      scaffold: generateScaffold(brief, findings, compiled),
    };
  }, [project, findings]);

  if (!project || !findings) return null;

  const statuses = project.taskStatus;
  const overall = progressOf(tasks, statuses);
  const file = scaffold[Math.min(activeFile, scaffold.length - 1)];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The spec, turned into work you can track — and a starting codebase
            that carries the findings into the files themselves. Where a review
            found an undecided question, the scaffold stops and says so instead
            of guessing.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl tabular-nums">
            {overall.done}
            <span className="text-muted-foreground">/{overall.total}</span>
          </p>
          <p className="text-xs text-muted-foreground">tasks done</p>
        </div>
      </div>

      <Progress
        value={(overall.done / Math.max(overall.total, 1)) * 100}
        className="h-1.5"
      />

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="scaffold" data-testid="tab-scaffold">
            Scaffold
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-10">
          {MILESTONES.map((milestone) => {
            const group = tasksIn(tasks, milestone.id);
            if (group.length === 0) return null;
            const progress = progressOf(group, statuses);

            return (
              <section key={milestone.id} data-milestone={milestone.id}>
                <div className="mb-1 flex flex-wrap items-baseline gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {milestone.title}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {progress.done}/{progress.total}
                  </span>
                  {progress.done === progress.total ? (
                    <Badge variant="success" className="text-[10px]">
                      complete
                    </Badge>
                  ) : null}
                </div>
                <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {milestone.blurb}
                </p>

                <ul className="space-y-2">
                  {group.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      status={statusOf(task, statuses)}
                      blockers={blockersOf(task, tasks, statuses)}
                      onToggle={() =>
                        setTaskStatus(
                          project.id,
                          task.id,
                          NEXT_STATUS[statusOf(task, statuses)]
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          <div className="border-t pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetTasks(project.id)}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset progress
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="scaffold" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Generated files
              </h2>
              <ul className="space-y-0.5">
                {scaffold.map((f, i) => (
                  <li key={f.path}>
                    <button
                      type="button"
                      onClick={() => setActiveFile(i)}
                      data-testid={`scaffold-${i}`}
                      className={cn(
                        "w-full truncate rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors",
                        i === activeFile
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      {f.path}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 px-2.5 text-xs leading-relaxed text-muted-foreground">
                Drop these into a Next.js app. They compile as-is; the
                <code className="mx-1 font-mono">TODO(loom)</code>
                comments are the decisions still open.
              </p>
            </div>

            <div>
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-xs font-medium tracking-wide text-primary uppercase">
                    Why this file looks like this
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {file.because}
                  </p>
                </CardContent>
              </Card>

              <CodeBlock
                code={file.contents}
                filename={file.path}
                language={file.language}
                maxHeight="42rem"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
