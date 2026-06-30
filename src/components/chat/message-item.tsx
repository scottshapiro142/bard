"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import type { ChatMessage } from "@/lib/viktor/types";
import { cn } from "@/lib/utils";
import { ViktorMark } from "@/components/viktor-logo";
import { DeliverableCard } from "@/components/chat/deliverable-card";
import { Badge } from "@/components/ui/badge";

function Worklog({
  steps,
  working,
}: {
  steps: ChatMessage["worklog"];
  working: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  if (!steps || steps.length === 0) {
    if (!working) return null;
  }
  return (
    <div className="mt-2 overflow-hidden rounded-lg border bg-muted/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {working ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <Check className="size-3.5 text-emerald-500" />
        )}
        <span>{working ? "Working…" : "Viktor's worklog"}</span>
        {steps && steps.length > 0 ? (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {steps.length} steps
          </Badge>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && steps && steps.length > 0 ? (
        <ol className="space-y-0 border-t px-3 py-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 py-1.5">
              <div className="flex flex-col items-center">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                {i < steps.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{step.label}</p>
                  {step.tool ? (
                    <Badge
                      variant="outline"
                      className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground"
                    >
                      {step.tool}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const working = message.status === "working";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <ViktorMark className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Viktor</span>
          <span className="text-xs text-muted-foreground">AI employee</span>
        </div>
        {message.content ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {message.content}
          </p>
        ) : working ? (
          <p className="text-sm text-muted-foreground">
            Getting to work…
          </p>
        ) : null}

        <Worklog steps={message.worklog} working={working} />

        {message.deliverable ? (
          <DeliverableCard deliverable={message.deliverable} />
        ) : null}
      </div>
    </div>
  );
}
