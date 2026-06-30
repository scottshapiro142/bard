"use client";

import * as React from "react";
import { Play, Plus, Trash2, Workflow, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViktor } from "@/lib/viktor/store";
import { relativeTime } from "@/lib/viktor/format";
import type { AutomationCadence } from "@/lib/viktor/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const CADENCES: AutomationCadence[] = [
  "Every morning",
  "Hourly",
  "Every weekday",
  "Weekly",
  "On anomaly",
];

export default function AutomationsPage() {
  const {
    automations,
    toggleAutomation,
    removeAutomation,
    runAutomationNow,
    addAutomation,
  } = useViktor();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [cadence, setCadence] = React.useState<AutomationCadence>("Every morning");
  const [open, setOpen] = React.useState(false);

  const activeCount = automations.filter((a) => a.enabled).length;

  const create = () => {
    if (!name.trim()) return;
    addAutomation({
      name: name.trim(),
      description: description.trim() || "Runs automatically on schedule.",
      cadence,
    });
    setName("");
    setDescription("");
    setCadence("Every morning");
    setOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Automations"
        description="Approve once, runs on autopilot. Viktor watches your tools and does recurring work without being asked."
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New automation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New automation</DialogTitle>
              <DialogDescription>
                Describe what Viktor should do and how often. He&apos;ll run it on
                autopilot.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="auto-name">Name</Label>
                <Input
                  id="auto-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekly churn report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-desc">What should Viktor do?</Label>
                <Input
                  id="auto-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Summarise churned accounts and post to #cs"
                />
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <div className="flex flex-wrap gap-2">
                  {CADENCES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCadence(c)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        cadence === c
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={create} disabled={!name.trim()}>
                Create automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="secondary" className="gap-1">
          <Zap className="size-3" />
          {activeCount} active
        </Badge>
        <span>{automations.length} total</span>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Workflow className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No automations yet. Create one to put recurring work on autopilot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    a.enabled
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Workflow className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {a.cadence}
                    </Badge>
                    {a.enabled ? (
                      <Badge variant="success" className="text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Paused
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {a.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.runs} runs ·{" "}
                    {a.lastRun
                      ? `last ran ${relativeTime(a.lastRun)}`
                      : "never run"}{" "}
                    · next: {a.enabled ? a.nextRunLabel : "paused"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAutomationNow(a.id)}
                  >
                    <Play className="size-3.5" />
                    Run now
                  </Button>
                  <Switch
                    checked={a.enabled}
                    onCheckedChange={() => toggleAutomation(a.id)}
                    aria-label="Toggle automation"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeAutomation(a.id)}
                    aria-label="Delete automation"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
