"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLoom } from "@/lib/loom/store";
import { previewGraph } from "@/lib/loom/compile";
import { resolveQuestions } from "@/lib/loom/interview";
import { GraphCanvas } from "@/components/graph-canvas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/lib/loom/types";

function ChoiceField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (next: string) => void;
}) {
  const multi = question.kind === "multi";
  const selected = new Set(value.split(",").filter(Boolean));

  const toggle = (option: string) => {
    if (!multi) return onChange(option);
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange([...next].join(","));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {question.options?.map((option) => {
        const active = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            data-testid={`option-${option.value}`}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              active
                ? "border-primary bg-primary/10"
                : "hover:border-primary/40 hover:bg-accent/40"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                active ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}
            >
              {active ? (
                <Check className="size-3 text-primary-foreground" />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getProject, setAnswer, setCursor, compile } = useLoom();
  const project = getProject(params.id);

  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const questions = React.useMemo(
    () => resolveQuestions(project?.answers ?? {}),
    [project?.answers]
  );

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [project?.cursor]);

  if (!project) return null;

  const index = Math.min(project.cursor, questions.length - 1);
  const question = questions[index];
  const value = project.answers[question.id] ?? "";
  const answered = questions.filter(
    (q) => (project.answers[q.id] ?? "").trim().length > 0
  ).length;
  const canAdvance = question.optional || value.trim().length > 0;
  const isLast = index === questions.length - 1;
  const graph = previewGraph(project.answers);

  const next = () => {
    if (!canAdvance) return;
    if (isLast) {
      compile(project.id);
      router.push(`/p/${project.id}/graph`);
      return;
    }
    setCursor(project.id, index + 1);
  };

  const back = () => setCursor(project.id, Math.max(0, index - 1));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="mb-6 flex items-center gap-4">
          <Progress
            value={(answered / questions.length) * 100}
            className="h-1.5 flex-1"
          />
          <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
            {answered} / {questions.length}
          </span>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-xs text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              {question.optional ? (
                <Badge variant="outline" className="text-[10px]">
                  optional
                </Badge>
              ) : null}
            </div>

            <h2
              className="text-xl font-semibold tracking-tight text-balance"
              data-testid="question-prompt"
            >
              {question.prompt}
            </h2>

            {question.helper ? (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {question.helper}
              </p>
            ) : null}

            <div className="mt-5">
              {question.kind === "choice" || question.kind === "multi" ? (
                <ChoiceField
                  question={question}
                  value={value}
                  onChange={(next) => setAnswer(project.id, question.id, next)}
                />
              ) : (
                <Textarea
                  ref={inputRef}
                  value={value}
                  rows={4}
                  placeholder={question.placeholder}
                  data-testid="answer-input"
                  onChange={(e) =>
                    setAnswer(project.id, question.id, e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      next();
                    }
                  }}
                  className="resize-none text-base"
                />
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={back}
                disabled={index === 0}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                onClick={next}
                disabled={!canAdvance}
                className="ml-auto gap-1.5"
                data-testid="next-question"
              >
                {isLast ? (
                  <>
                    <Sparkles className="size-4" />
                    Compile the graph
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>

            {question.kind === "textarea" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                ⌘↵ to continue
              </p>
            ) : null}
          </CardContent>
        </Card>

        {answered > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Answered
            </h3>
            <ul className="space-y-1">
              {questions.map((q, i) => {
                const a = (project.answers[q.id] ?? "").trim();
                if (!a || i === index) return null;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => setCursor(project.id, i)}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="block text-xs text-muted-foreground">
                        {q.prompt}
                      </span>
                      <span className="mt-0.5 block truncate text-sm">{a}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-32 lg:self-start">
        <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          The graph so far
        </h3>
        <GraphCanvas graph={graph} />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {graph.nodes.length === 0
            ? "Every answer adds a review. The checker appears once there's more than one thing to cross-reference."
            : `${graph.nodes.filter((n) => n.kind === "leaf").length} reviews will run in parallel, then the checker reads all of them together.`}
        </p>
      </aside>
    </div>
  );
}
