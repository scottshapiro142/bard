"use client";

import * as React from "react";
import { ArrowRight, Check, MessageSquareWarning } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RaisedCheckpoint } from "@/lib/loom/checkpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * The moment the app hands back to the person whose app it is.
 *
 * Deliberately occasional. If every card in the build said "we'd love your
 * feedback" it would read as noise instead of an actual request.
 */
export function CheckpointCard({
  checkpoint,
  designerName,
  onName,
  onOpen,
  onApprove,
  onRequestChanges,
}: {
  checkpoint: RaisedCheckpoint;
  designerName: string;
  onName: (name: string) => void;
  onOpen: () => void;
  onApprove: () => void;
  onRequestChanges: (note: string) => void;
}) {
  const [writing, setWriting] = React.useState(false);
  const [note, setNote] = React.useState("");

  const settled = checkpoint.state === "approved";

  return (
    <div
      data-checkpoint={checkpoint.feature.id}
      data-state={checkpoint.state}
      className={cn(
        "rounded-xl border p-4",
        settled
          ? "border-emerald-500/30 bg-emerald-500/5"
          : checkpoint.state === "changes-requested"
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-primary/40 bg-primary/5"
      )}
    >
      <p className="text-sm font-semibold" data-testid="checkpoint-headline">
        {checkpoint.headline}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {checkpoint.body}
      </p>

      {checkpoint.notes.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
          {checkpoint.notes.map((n) => (
            <li key={n.id} className="text-sm text-muted-foreground italic">
              “{n.text}”
            </li>
          ))}
        </ul>
      ) : null}

      {!settled && !designerName.trim() ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            What should we call you?
          </span>
          <Input
            defaultValue=""
            data-testid="designer-name"
            placeholder="Your name"
            onBlur={(e) => onName(e.target.value)}
            className="h-8 w-40"
          />
        </div>
      ) : null}

      {writing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={note}
            autoFocus
            rows={3}
            data-testid="feedback-note"
            placeholder="What felt wrong? Your words go straight onto the task."
            onChange={(e) => setNote(e.target.value)}
            className="resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!note.trim()}
              data-testid="submit-feedback"
              onClick={() => {
                onRequestChanges(note);
                setNote("");
                setWriting(false);
              }}
            >
              Add it to the list
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpen}>
            Open it in the preview
            <ArrowRight className="size-3.5" />
          </Button>
          {!settled ? (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                data-testid="approve-checkpoint"
                onClick={onApprove}
              >
                <Check className="size-3.5" />
                Looks right
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                data-testid="request-changes"
                onClick={() => setWriting(true)}
              >
                <MessageSquareWarning className="size-3.5" />
                Needs work
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
