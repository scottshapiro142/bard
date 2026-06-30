"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  LayoutDashboard,
  Code2,
  FileSpreadsheet,
  Megaphone,
  LifeBuoy,
  Send,
  Sparkles,
} from "lucide-react";

import { useViktor } from "@/lib/viktor/store";
import { relativeTime } from "@/lib/viktor/format";
import { DASHBOARD } from "@/lib/viktor/seed";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { kindMeta } from "@/components/kind-meta";

const SUGGESTIONS = [
  {
    icon: LayoutDashboard,
    label: "Build a revenue dashboard",
    task: "Build me a dashboard with revenue, signups, CAC and pipeline in one view.",
  },
  {
    icon: Megaphone,
    label: "Audit this week's ad spend",
    task: "Audit our ad spend this week and tell me why CAC went up.",
  },
  {
    icon: FileSpreadsheet,
    label: "Reconcile Stripe & QuickBooks",
    task: "Reconcile our invoices across Stripe and QuickBooks and flag mismatches.",
  },
  {
    icon: Code2,
    label: "Fix a bug and open a PR",
    task: "Read the repo, fix the webhook double-charge bug and open a pull request.",
  },
  {
    icon: LifeBuoy,
    label: "Triage the support queue",
    task: "Triage our open support tickets and draft replies for the top issues.",
  },
];

export default function OverviewPage() {
  const router = useRouter();
  const { sendTask, activity, connectedCount, automations } = useViktor();
  const [task, setTask] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const start = async (text: string) => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const id = await sendTask(null, text);
    router.push(`/chat?c=${id}`);
  };

  const activeAutomations = automations.filter((a) => a.enabled).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Good to see you"
        description="Viktor is your AI employee. Assign a task in plain English and he does the work — then delivers a real output."
      />

      {/* Hero task composer */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="gap-1">
              <Sparkles className="size-3" />
              Not a tool. A hire.
            </Badge>
          </div>
          <CardTitle className="text-xl">What should Viktor work on?</CardTitle>
          <CardDescription>
            He&apos;ll query your tools, run code and deliver a report, dashboard,
            app or PR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Build a dashboard of revenue, signups and pipeline…"
              className="min-h-24 resize-none pr-12"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  start(task);
                }
              }}
            />
            <Button
              size="icon"
              className="absolute bottom-3 right-3"
              disabled={!task.trim() || submitting}
              onClick={() => start(task)}
              aria-label="Assign task"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => start(s.task)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                <s.icon className="size-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DASHBOARD.kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="space-y-1 pt-0">
              <p className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                {kpi.value}
              </p>
              <p
                className={
                  "inline-flex items-center gap-0.5 text-xs font-medium " +
                  (kpi.positive ? "text-emerald-500" : "text-destructive")
                }
              >
                <ArrowUpRight className="size-3" />
                {kpi.delta}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent work</CardTitle>
              <CardDescription>What Viktor has delivered lately.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/activity">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.slice(0, 5).map((item) => {
              const meta = kindMeta(item.kind);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg " +
                      meta.className
                    }
                  >
                    <meta.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle>Your workspace</CardTitle>
            <CardDescription>Viktor at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stat label="Connected tools" value={`${connectedCount} / 3,200+`} />
            <Stat label="Active automations" value={`${activeAutomations}`} />
            <Stat label="Lives in" value="Slack & Teams" />
            <Stat label="Credits" value="$100 remaining" />
            <Button asChild variant="outline" className="w-full">
              <Link href="/integrations">
                Manage integrations
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
