"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  MessagesSquare,
  Network,
  Play,
  Hammer,
  Trash2,
} from "lucide-react";

import { useLoom } from "@/lib/loom/store";
import { REFERENCE_YAML } from "@/lib/loom/yaml";
import { interviewProgress } from "@/lib/loom/interview";
import { LoomWordmark } from "@/components/loom-logo";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Interview",
    body: "Eleven questions, adaptive. What you're building, who for, and the one thing it has to do. Branches on what you answer.",
  },
  {
    icon: Network,
    title: "Compile",
    body: "The answers become a graph. Independent reviews fan out; a checker sits downstream of all of them.",
  },
  {
    icon: Play,
    title: "Run",
    body: "Every review runs at once. The checker reads all of them together and finds what none of them could see alone.",
  },
  {
    icon: FileText,
    title: "Spec",
    body: "One prioritized list. Critical first, then medium, then low, with the reason each thing is where it is.",
  },
  {
    icon: Hammer,
    title: "Build",
    body: "The spec becomes tracked tasks — decisions gate the work waiting behind them — plus a starting codebase that compiles.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { projects, ready, createProject, createExampleProject, deleteProject } =
    useLoom();

  const start = () => router.push(`/p/${createProject()}/interview`);
  const example = () => router.push(`/p/${createExampleProject()}/graph`);

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <LoomWordmark />
          <Badge variant="secondary" className="ml-3 hidden sm:inline-flex">
            for product designers
          </Badge>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Interview in.
              <br />
              <span className="text-primary">Graph out.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              One prompt asking for &quot;a review of my app idea&quot; gives you
              one opinion, hedged. Loom asks you eleven questions, compiles the
              answers into a workflow graph, and runs each review independently
              — so a checker can find the problems that only show up when you
              read all of them at once. Then it turns what&apos;s left into a
              tracked build.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={start} data-testid="start-interview">
                Start an interview
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={example}
                data-testid="load-example"
              >
                Load a filled-in example
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              The shape it borrows
            </p>
            <CodeBlock code={REFERENCE_YAML} filename="code-review.yaml" />
            <p className="mt-3 text-sm text-muted-foreground">
              Three reviews that don&apos;t know about each other, a checker that
              reads all three, a summary that ranks what&apos;s left. Loom builds
              the same thing for a product design — the reviews are just about
              audiences, flows, and edge cases instead of files.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="border-border/70">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <step.icon className="size-4 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 pb-24 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your projects</h2>
          {projects.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={start}>
              New project
            </Button>
          ) : null}
        </div>

        {!ready ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Start an interview, or load the example to see a
              finished graph in about fifteen seconds.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => {
              const progress = Math.round(interviewProgress(project.answers) * 100);
              const tasksDone = Object.values(project.taskStatus ?? {}).filter(
                (status) => status === "done"
              ).length;
              const stage = tasksDone > 0
                ? "build"
                : project.run?.finishedAt
                  ? "spec"
                  : project.graph
                    ? "graph"
                    : "interview";
              const findings =
                project.run?.nodes.summary?.result?.findings.length ?? null;

              return (
                <li key={project.id}>
                  <Card className="group relative transition-colors hover:border-primary/50">
                    <CardContent className="pt-6">
                      <Link
                        href={`/p/${project.id}/${stage}`}
                        className="block"
                        data-testid="project-link"
                      >
                        <h3 className="pr-8 text-sm font-medium text-balance">
                          {project.name}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {project.run?.finishedAt ? (
                            <Badge variant="success">Spec ready</Badge>
                          ) : project.graph ? (
                            <Badge variant="secondary">Graph compiled</Badge>
                          ) : (
                            <Badge variant="outline">
                              Interview {progress}%
                            </Badge>
                          )}
                          {project.graph ? (
                            <span className="text-xs text-muted-foreground">
                              {project.graph.nodes.length} nodes
                            </span>
                          ) : null}
                          {findings !== null ? (
                            <span className="text-xs text-muted-foreground">
                              {findings} findings
                            </span>
                          ) : null}
                          {tasksDone > 0 ? (
                            <span className="text-xs text-emerald-500">
                              {tasksDone} tasks done
                            </span>
                          ) : null}
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete project"
                        className="absolute top-4 right-3 size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
