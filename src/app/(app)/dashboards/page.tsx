"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";

import { DASHBOARD } from "@/lib/viktor/seed";
import { PageHeader } from "@/components/page-header";
import { AreaChart, BarList } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function DashboardsPage() {
  const [refreshedAt, setRefreshedAt] = React.useState<string>("just now");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboards"
        description="Live dashboards Viktor built from your connected tools. They refresh automatically."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshedAt("just now")}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </PageHeader>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="gap-1">
                <Sparkles className="size-3" />
                Built by Viktor
              </Badge>
              <span className="text-xs text-muted-foreground">
                Refreshed {refreshedAt} · hourly
              </span>
            </div>
            <CardTitle className="text-xl">Growth &amp; Revenue</CardTitle>
            <CardDescription>
              Revenue, signups, CAC and pipeline unified from Stripe, Postgres and
              HubSpot.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {DASHBOARD.kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border bg-card p-4"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {kpi.value}
                </p>
                <p
                  className={
                    "mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium " +
                    (kpi.positive ? "text-emerald-500" : "text-destructive")
                  }
                >
                  <ArrowUpRight className="size-3" />
                  {kpi.delta} vs last month
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="mrr">
              <TabsList>
                <TabsTrigger value="mrr">MRR</TabsTrigger>
                <TabsTrigger value="signups">Signups</TabsTrigger>
              </TabsList>
              <TabsContent value="mrr" className="pt-4">
                <AreaChart
                  data={DASHBOARD.revenue.map((r) => ({
                    label: r.month,
                    value: r.mrr,
                  }))}
                />
              </TabsContent>
              <TabsContent value="signups" className="pt-4">
                <AreaChart
                  data={DASHBOARD.revenue.map((r) => ({
                    label: r.month,
                    value: r.signups,
                  }))}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Acquisition by channel</CardTitle>
            <CardDescription>ROAS this quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              data={DASHBOARD.channels.map((c) => ({
                label: c.name,
                value: c.roas,
                hint: `· CAC $${c.cac}`,
              }))}
              formatValue={(v) => `${v.toFixed(1)}x`}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-between gap-3 py-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-medium">Need a different view?</p>
            <p className="text-sm text-muted-foreground">
              Ask Viktor to build any dashboard — he&apos;ll wire it to your tools
              and deploy it.
            </p>
          </div>
          <Button asChild>
            <Link href="/chat">
              <Sparkles className="size-4" />
              Build a dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
