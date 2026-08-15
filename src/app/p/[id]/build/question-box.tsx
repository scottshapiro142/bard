"use client";

import * as React from "react";
import { Check, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OpenQuestion } from "@/lib/loom/questions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Loom asking, rather than Loom listing.
 *
 * A decision the app never hears the answer to is just a checkbox. Answering
 * here is what actually settles it — the answer is remembered, shows up in the
 * handbook, and marks the task done.
 *
 * The suggested answers each say what they cost. There's no right one, and
 * pretending otherwise would make this a quiz.
 */
export function QuestionBox({
  question,
  answer,
  taskId,
  onAnswer,
}: {
  question: OpenQuestion;
  answer?: string;
  taskId: string;
  onAnswer: (answer: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState("");

  if (answer && !editing) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="text-xs text-muted-foreground">You said</p>
        <p className="mt-1 text-sm">{answer}</p>
        <button
          type="button"
          onClick={() => {
            setText(answer);
            setEditing(true);
          }}
          className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
          Change my mind
        </button>
      </div>
    );
  }

  const submit = (value: string) => {
    if (!value.trim()) return;
    onAnswer(value);
    setEditing(false);
    setText("");
  };

  return (
    <div
      className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
      data-question={taskId}
    >
      <p className="text-sm font-medium">{question.ask}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {question.why}
      </p>

      {question.options.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {question.options.map((option) => (
            <button
              key={option.label}
              type="button"
              data-answer={option.label}
              onClick={() => submit(option.label)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                "hover:border-primary hover:bg-primary/10"
              )}
            >
              <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.consequence}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        {question.hint ? (
          <p className="mb-1.5 text-xs text-muted-foreground">{question.hint}</p>
        ) : null}
        <Textarea
          value={text}
          rows={2}
          data-testid={`answer-${taskId}`}
          placeholder={
            question.options.length
              ? "…or say it in your own words"
              : "Your answer"
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(text);
            }
          }}
          className="resize-none text-sm"
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            disabled={!text.trim()}
            data-testid={`save-answer-${taskId}`}
            onClick={() => submit(text)}
          >
            That&apos;s my answer
          </Button>
          {editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
