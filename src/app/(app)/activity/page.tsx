"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViktor } from "@/lib/viktor/store";
import { relativeTime } from "@/lib/viktor/format";
import { kindMeta } from "@/components/kind-meta";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "report", label: "Reports" },
  { key: "dashboard", label: "Dashboards" },
  { key: "code", label: "Code" },
  { key: "automation", label: "Automations" },
] as const;

export default function ActivityPage() {
  const { activity } = useViktor();
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["key"]>(
    "all"
  );

  const filtered = activity.filter(
    (a) => filter === "all" || a.kind === filter
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Activity"
        description="Everything Viktor has delivered — from chat tasks and automations alike."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nothing here yet.
            </p>
            <Button asChild size="sm">
              <Link href="/chat">Assign Viktor a task</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            {filtered.map((item, idx) => {
              const meta = kindMeta(item.kind);
              return (
                <div key={item.id}>
                  <div className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40">
                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        meta.className
                      )}
                    >
                      <meta.icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.source} · {relativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  {idx < filtered.length - 1 ? (
                    <div className="mx-3 border-b" />
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
