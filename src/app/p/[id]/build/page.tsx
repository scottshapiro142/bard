"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDashed,
  FileText,
  Lock,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { deriveBrief } from "@/lib/loom/brief";
import { deriveAppSpec, type AppSpec } from "@/lib/loom/app";
import {
  MILESTONES,
  NEXT_STATUS,
  blockersOf,
  compileTasks,
  progressOf,
  statusOf,
  tasksIn,
} from "@/lib/loom/tasks";
import { buildFeatures } from "@/lib/loom/features";
import {
  raisedCheckpoints,
  reviewTaskFor,
  taskFromFeedback,
} from "@/lib/loom/checkpoints";
import { generateDocs } from "@/lib/loom/docs";
import { generateScaffold } from "@/lib/loom/scaffold";
import { AppPreview } from "@/components/preview/app-preview";
import { CodeBlock, type CodeLanguage } from "@/components/code-block";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Task, TaskStatus } from "@/lib/loom/types";
import { ScreensPanel } from "./screens-panel";
import { ThemePanel } from "./theme-panel";
import { CheckpointCard } from "./checkpoint-card";
import { QuestionBox } from "./question-box";
import { BrainPanel } from "./brain-panel";
import { ShipPanel } from "./ship-panel";

const STATUS_ICON = { todo: CircleDashed, doing: Circle, done: CircleCheck } as const;

const KIND_LABEL: Record<string, string> = {
  decide: "a decision",
  design: "design work",
  build: "building",
  review: "your turn",
};

function TaskRow({
  task,
  status,
  blockers,
  answer,
  onToggle,
  onOpen,
  onAnswer,
}: {
  task: Task;
  status: TaskStatus;
  blockers: Task[];
  answer?: string;
  onToggle: () => void;
  onOpen?: () => void;
  onAnswer?: (answer: string) => void;
}) {
  const [showDetail, setShowDetail] = React.useState(false);
  const Icon = STATUS_ICON[status];
  const blocked = blockers.length > 0 && status !== "done";

  return (
    <li
      className={cn(
        "rounded-xl border p-3 transition-colors",
        status === "done" && "opacity-55",
        status === "doing" && "border-primary/50 bg-primary/5",
        task.kind === "review" && "border-primary/40"
      )}
      data-task={task.id}
      data-status={status}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Mark "${task.plain.what}" as ${NEXT_STATUS[status]}`}
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
            data-task-title
            className={cn("text-sm font-medium", status === "done" && "line-through")}
          >
            {task.plain.what}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {task.plain.why}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {KIND_LABEL[task.kind]}
            </Badge>
            <Badge variant="secondary" className="text-[10px] tabular-nums">
              {task.size}
            </Badge>
            {blocked ? (
              <span
                className="flex items-center gap-1 text-[10px] text-amber-500"
                title={blockers.map((b) => b.plain.what).join("\n")}
              >
                <Lock className="size-3" />
                {blockers.length === 1
                  ? "waiting on one decision"
                  : `waiting on ${blockers.length} decisions`}
              </span>
            ) : null}
            {onOpen ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={onOpen}
              >
                Show me
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowDetail(!showDetail)}
              className="ml-auto flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {showDetail ? "Hide" : "Show"} the technical detail
              <ChevronDown
                className={cn("size-3 transition-transform", showDetail && "rotate-180")}
              />
            </button>
          </div>

          {task.question && onAnswer && (status !== "done" || answer) ? (
            <QuestionBox
              question={task.question}
              answer={answer}
              taskId={task.id}
              onAnswer={onAnswer}
            />
          ) : null}

          {showDetail ? (
            <div className="mt-3 space-y-2 border-t pt-3">
              <Markdown source={task.detail} />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Done when:</span>{" "}
                {task.plain.done}
              </p>
              {task.from ? (
                <p className="font-mono text-[10px] text-muted-foreground">
                  raised by {task.from}
                </p>
              ) : null}
              {task.severity ? (
                <Badge
                  variant={
                    task.severity === "critical"
                      ? "destructive"
                      : task.severity === "medium"
                        ? "warning"
                        : "secondary"
                  }
                  className="text-[10px]"
                >
                  {task.severity}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function BuildPage() {
  const params = useParams<{ id: string }>();
  const {
    getProject,
    setTaskStatus,
    resetTasks,
    setApp,
    setDesignerName,
    setCheckpoint,
    addFeedback,
    answerQuestion,
    setBrainToken,
  } = useLoom();
  const project = getProject(params.id);

  const [activeFile, setActiveFile] = React.useState(0);
  const [activeDoc, setActiveDoc] = React.useState(0);
  const [previewScreen, setPreviewScreen] = React.useState<string | undefined>();

  const findings = project?.run?.nodes.summary?.result?.findings;
  const projectId = project?.id;
  const savedApp = project?.app ?? null;
  const answers = project?.answers;

  const brief = React.useMemo(
    () => (answers ? deriveBrief(answers) : null),
    [answers]
  );

  // Derive the app once, then it's the designer's to change.
  React.useEffect(() => {
    if (!projectId || !brief || savedApp) return;
    setApp(projectId, deriveAppSpec(brief));
  }, [projectId, brief, savedApp, setApp]);

  const model = React.useMemo(() => {
    if (!project || !brief || !findings || !savedApp) return null;
    const app = savedApp;

    const baseTasks = compileTasks(brief, findings, app);
    const features0 = buildFeatures(app, baseTasks);
    const feedbackTasks = project.feedback
      .map((note) => {
        const feature = features0.find((f) => f.id === note.featureId);
        return feature ? taskFromFeedback(note, feature) : null;
      })
      .filter((t): t is Task => t !== null);

    const tasks = [...baseTasks, ...feedbackTasks];
    const features = buildFeatures(app, tasks);
    const checkpoints = raisedCheckpoints(
      features,
      tasks,
      project.taskStatus,
      project.checkpoints,
      project.feedback,
      project.designerName
    );
    const reviewTasks = checkpoints
      .filter((c) => c.state === "ready")
      .map(reviewTaskFor);

    const allTasks = [...tasks, ...reviewTasks];
    const docs = generateDocs({
      brief,
      app,
      findings,
      tasks: allTasks,
      features,
      statuses: project.taskStatus,
      feedback: project.feedback,
      leafCount:
        project.graph?.nodes.filter((n) => n.kind === "leaf").length ?? 0,
      designerName: project.designerName,
      decisions: project.decisions,
    });
    const scaffold = generateScaffold({ brief, app, findings, tasks: allTasks, docs });

    return { app, tasks: allTasks, checkpoints, docs, scaffold, reviewTasks };
  }, [project, brief, findings, savedApp]);

  if (!project || !model || !brief) return null;

  const { app, tasks, checkpoints, docs, scaffold, reviewTasks } = model;
  const statuses = project.taskStatus;
  const overall = progressOf(tasks, statuses);
  const file = scaffold[Math.min(activeFile, scaffold.length - 1)];
  const doc = docs[Math.min(activeDoc, docs.length - 1)];
  const change = (next: AppSpec) => setApp(project.id, next);
  const show = (screenId?: string) => screenId && setPreviewScreen(screenId);

  const needsYou = checkpoints.filter((c) => c.state !== "approved");
  const openQuestions = tasks.filter(
    (t) => t.question && statusOf(t, statuses) !== "done"
  ).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-[calc(100dvh-9.5rem)] min-h-[34rem]">
        <ResizablePanelGroup orientation="horizontal" className="gap-0">
          <ResizablePanel defaultSize="54%" minSize="32%">
            <div className="flex h-full flex-col pr-4">
              <div className="flex items-end justify-between gap-4 pb-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Build</h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Work through it, change it, and try it as you go.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg tabular-nums">
                    {overall.done}
                    <span className="text-muted-foreground">/{overall.total}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">done</p>
                </div>
              </div>

              <Progress
                value={(overall.done / Math.max(overall.total, 1)) * 100}
                className="mb-4 h-1.5"
              />

              <Tabs defaultValue="tasks" className="flex min-h-0 flex-1 flex-col">
                <TabsList>
                  <TabsTrigger value="tasks" data-testid="tab-tasks">
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="screens" data-testid="tab-screens">
                    Screens
                  </TabsTrigger>
                  <TabsTrigger value="theme" data-testid="tab-theme">
                    Theme
                  </TabsTrigger>
                  <TabsTrigger value="docs" data-testid="tab-docs">
                    Docs
                  </TabsTrigger>
                  <TabsTrigger value="brain" data-testid="tab-brain">
                    Brain
                  </TabsTrigger>
                  <TabsTrigger value="scaffold" data-testid="tab-scaffold">
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="ship" data-testid="tab-ship">
                    Ship
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="tasks"
                  className="min-h-0 flex-1 space-y-8 overflow-y-auto pt-4 pr-1"
                >
                  {openQuestions > 0 ? (
                    <p
                      className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground"
                      data-testid="open-questions"
                    >
                      <span className="font-medium text-foreground">
                        Loom needs to know {openQuestions}{" "}
                        {openQuestions === 1 ? "thing" : "things"}.
                      </span>{" "}
                      They&apos;re marked below. Answering them is how the app
                      gets designed — and each one unblocks work waiting behind
                      it.
                    </p>
                  ) : null}

                  {needsYou.length > 0 ? (
                    <section data-testid="your-turn">
                      <h2 className="mb-3 text-base font-semibold tracking-tight">
                        Your turn
                      </h2>
                      <div className="space-y-3">
                        {needsYou.map((checkpoint) => (
                          <CheckpointCard
                            key={checkpoint.feature.id}
                            checkpoint={checkpoint}
                            designerName={project.designerName}
                            onName={(name) => setDesignerName(project.id, name)}
                            onOpen={() => show(checkpoint.feature.previewScreenId)}
                            onApprove={() =>
                              setCheckpoint(project.id, checkpoint.feature.id, "approved")
                            }
                            onRequestChanges={(note) =>
                              addFeedback(project.id, checkpoint.feature.id, note)
                            }
                          />
                        ))}
                      </div>

                      {reviewTasks.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {reviewTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              status={statusOf(task, statuses)}
                              blockers={[]}
                              onOpen={() => show(task.previewScreenId)}
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
                      ) : null}
                    </section>
                  ) : null}

                  {MILESTONES.map((milestone) => {
                    const group = tasksIn(tasks, milestone.id).filter(
                      (t) => t.kind !== "review"
                    );
                    if (group.length === 0) return null;
                    const progress = progressOf(group, statuses);

                    return (
                      <section key={milestone.id} data-milestone={milestone.id}>
                        <div className="mb-1 flex flex-wrap items-baseline gap-3">
                          <h2 className="text-base font-semibold tracking-tight">
                            {milestone.title}
                          </h2>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {progress.done}/{progress.total}
                          </span>
                          {progress.done === progress.total ? (
                            <Badge variant="success" className="text-[10px]">
                              done
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                          {milestone.blurb}
                        </p>
                        <ul className="space-y-2">
                          {group.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              status={statusOf(task, statuses)}
                              blockers={blockersOf(task, tasks, statuses)}
                              answer={project.decisions[task.id]}
                              onAnswer={(a) =>
                                answerQuestion(project.id, task.id, a)
                              }
                              onOpen={
                                task.previewScreenId
                                  ? () => show(task.previewScreenId)
                                  : undefined
                              }
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

                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTasks(project.id)}
                      className="gap-2 text-muted-foreground"
                    >
                      <RotateCcw className="size-3.5" />
                      Start the list again
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent
                  value="screens"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <ScreensPanel app={app} onChange={change} onPreview={setPreviewScreen} />
                </TabsContent>

                <TabsContent
                  value="theme"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <ThemePanel app={app} onChange={change} />
                </TabsContent>

                <TabsContent
                  value="docs"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Everything about this project, written so anyone can read it —
                    you, whoever you report to, and whoever ends up building it.
                    These ship with the code.
                  </p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {docs.map((d, i) => (
                      <button
                        key={d.path}
                        type="button"
                        data-testid={`doc-${i}`}
                        onClick={() => setActiveDoc(i)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          i === activeDoc
                            ? "border-primary bg-primary/15"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {d.title}
                      </button>
                    ))}
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <Markdown source={doc.body} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="brain"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <BrainPanel
                    projectId={project.id}
                    projectName={project.name}
                    brief={brief}
                    app={app}
                    tasks={tasks}
                    answers={project.decisions}
                    token={project.brainToken}
                    onToken={(t) => setBrainToken(project.id, t)}
                  />
                </TabsContent>

                <TabsContent
                  value="scaffold"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <div className="mb-3 flex flex-wrap gap-1">
                    {scaffold.map((f, i) => (
                      <button
                        key={f.path}
                        type="button"
                        data-testid={`scaffold-${i}`}
                        onClick={() => setActiveFile(i)}
                        className={cn(
                          "rounded-md px-2 py-1 font-mono text-[11px] transition-colors",
                          i === activeFile
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        {f.path}
                      </button>
                    ))}
                  </div>

                  <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-primary uppercase">
                      <FileText className="size-3" />
                      Why this file looks like this
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {file.because}
                    </p>
                  </div>

                  <CodeBlock
                    code={file.contents}
                    filename={file.path}
                    language={file.language as CodeLanguage}
                  />
                </TabsContent>

                <TabsContent
                  value="ship"
                  className="min-h-0 flex-1 overflow-y-auto pt-4 pr-1"
                >
                  <ShipPanel
                    projectId={project.id}
                    name={project.name}
                    answers={project.answers}
                    app={app}
                    designerName={project.designerName}
                    decisions={project.decisions}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="46%" minSize="26%">
            <div className="h-full pl-4">
              <AppPreview
                app={app}
                screenId={previewScreen}
                onScreenChange={setPreviewScreen}
                className="h-full"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
}
