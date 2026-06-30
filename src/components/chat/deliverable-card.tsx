import { ExternalLink } from "lucide-react";

import type { Deliverable } from "@/lib/viktor/types";
import { kindMeta } from "@/components/kind-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const meta = kindMeta(deliverable.kind);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start gap-3 border-b bg-muted/30 p-4">
        <div
          className={
            "flex size-9 shrink-0 items-center justify-center rounded-lg " +
            meta.className
          }
        >
          <meta.icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {meta.label}
            </Badge>
          </div>
          <p className="mt-1 font-semibold leading-tight">{deliverable.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {deliverable.summary}
          </p>
        </div>
      </div>

      {deliverable.metrics && deliverable.metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {deliverable.metrics.map((m) => (
            <div key={m.label} className="bg-card p-3">
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {m.value}
              </p>
              {m.delta ? (
                <p className="text-[11px] text-emerald-500">{m.delta}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 p-4">
        <ul className="space-y-1.5">
          {deliverable.body.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="pt-1">
          <Button variant="outline" size="sm" className="gap-1.5">
            Open {meta.label.toLowerCase()}
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
