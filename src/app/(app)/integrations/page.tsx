"use client";

import * as React from "react";
import { Check, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViktor } from "@/lib/viktor/store";
import type { IntegrationCategory } from "@/lib/viktor/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES: (IntegrationCategory | "All")[] = [
  "All",
  "Communication",
  "Data & Analytics",
  "CRM & Sales",
  "Finance",
  "Engineering",
  "Marketing",
  "Support",
  "Productivity",
];

export default function IntegrationsPage() {
  const { integrations, toggleIntegration, connectedCount } = useViktor();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]>(
    "All"
  );

  const filtered = integrations.filter((i) => {
    const matchesCategory = category === "All" || i.category === category;
    const matchesQuery =
      !query ||
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.description.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Integrations"
        description="Connect Viktor to your stack. He works across 3,200+ tools — these are the ones in your workspace."
      >
        <Badge variant="secondary" className="h-7 px-3">
          {connectedCount} connected
        </Badge>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === c
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No integrations match “{query}”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.id} className="gap-0 py-0">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: i.color }}
                  >
                    {i.mark}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category}</p>
                  </div>
                  {i.connected ? (
                    <Badge variant="success" className="gap-1">
                      <Check className="size-3" />
                      Connected
                    </Badge>
                  ) : null}
                </div>
                <p className="min-h-8 text-sm text-muted-foreground">
                  {i.description}
                </p>
                <Button
                  variant={i.connected ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleIntegration(i.id)}
                >
                  {i.connected ? (
                    "Disconnect"
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
