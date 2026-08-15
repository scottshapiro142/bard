"use client";

import * as React from "react";
import { ChevronLeft, Plus, ShieldAlert, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  displayField,
  entityOf,
  pluralName,
  type AppSpec,
  type EntitySpec,
  type Field,
  type ScreenSpec,
  type ScreenState,
} from "@/lib/loom/app";

export type PreviewState = "ready" | ScreenState;

const NAMES = ["Ada Fournier", "Jonah Weir", "Priya Raman", "Marco Silva", "Elin Haugen"];
const TITLES = [
  "Tuesday morning session",
  "Harbour shoot",
  "Autumn portraits",
  "Studio half-day",
  "Rooftop golden hour",
];
const STATUSES = ["Confirmed", "Draft", "Awaiting deposit", "Complete"];

/** Plausible content, so the preview reads like a product rather than a wireframe. */
function sampleValue(field: Field, row: number): string {
  switch (field.type) {
    case "money":
      return ["£240.00", "£75.00", "£1,150.00", "£360.00"][row % 4];
    case "date":
      return ["12 Mar, 9:00am", "3 Apr, 2:30pm", "28 Feb, 11:00am", "9 May, 4:00pm"][row % 4];
    case "number":
      return String((row + 2) * 3);
    case "yes-no":
      return row % 2 === 0 ? "Yes" : "No";
    case "status":
      return STATUSES[row % STATUSES.length];
    case "link":
      return NAMES[(row + 1) % NAMES.length];
    default:
      return /name/i.test(field.name)
        ? NAMES[row % NAMES.length]
        : TITLES[row % TITLES.length];
  }
}

function labelFor(field: Field): string {
  return field.name
    .replace(/Id$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function Shell({
  title,
  action,
  back,
  children,
}: {
  title: string;
  action?: string;
  back?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-background p-6 text-foreground">
      {back ? (
        <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          Back
        </div>
      ) : null}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {action ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            <Plus className="size-3.5" />
            {action}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ thing, action }: { thing: string; action: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">No {thing} yet</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        This is what everyone sees first. Say what a {thing.replace(/s$/, "")} is
        for and what happens once they add one.
      </p>
      <span className="mt-4 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        {action}
      </span>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/5 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

function Problem({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-8 text-center">
      <Icon className="mx-auto size-5 text-destructive" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action ? (
        <span className="mt-4 inline-block rounded-md border border-border px-3 py-1.5 text-sm">
          {action}
        </span>
      ) : null}
    </div>
  );
}

function ListScreen({
  screen,
  entity,
  state,
}: {
  screen: ScreenSpec;
  entity?: EntitySpec;
  state: PreviewState;
}) {
  const things = entity ? pluralName(entity.name).toLowerCase() : "items";
  const one = entity ? entity.name.toLowerCase() : "item";
  const primary = displayField(entity);
  const secondary = entity?.fields.find(
    (f) => !f.system && f.id !== primary?.id && f.type !== "link"
  );

  return (
    <Shell title={screen.name} action={`New ${one}`}>
      {state === "empty" ? (
        <Empty thing={things} action={`Add your first ${one}`} />
      ) : state === "loading" ? (
        <Loading />
      ) : state === "error" ? (
        <Problem
          icon={TriangleAlert}
          title="We couldn't load your list"
          body="Something went wrong on our side, not yours. Try again in a moment."
          action="Try again"
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {primary ? sampleValue(primary, row) : TITLES[row % TITLES.length]}
                </p>
                {secondary ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {labelFor(secondary)} · {sampleValue(secondary, row)}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {STATUSES[row % STATUSES.length]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function DetailScreen({
  screen,
  entity,
  state,
}: {
  screen: ScreenSpec;
  entity?: EntitySpec;
  state: PreviewState;
}) {
  const primary = displayField(entity);
  const rest = (entity?.fields ?? []).filter(
    (f) => f.id !== primary?.id && f.name !== "id"
  );

  if (state === "loading") {
    return (
      <Shell title=" " back>
        <Loading />
      </Shell>
    );
  }
  if (state === "error") {
    return (
      <Shell title={screen.name} back>
        <Problem
          icon={TriangleAlert}
          title="We couldn't open this"
          body="It may have been deleted, or something went wrong loading it."
          action="Try again"
        />
      </Shell>
    );
  }
  if (state === "denied") {
    return (
      <Shell title={screen.name} back>
        <Problem
          icon={ShieldAlert}
          title="This isn't yours to see"
          body="You may have followed an old link, or been removed from it since."
        />
      </Shell>
    );
  }

  return (
    <Shell title={primary ? sampleValue(primary, 0) : screen.name} back>
      <dl className="overflow-hidden rounded-xl border border-border bg-card">
        {rest.map((field, i) => (
          <div
            key={field.id}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3",
              i > 0 && "border-t border-border"
            )}
          >
            <dt className="text-sm text-muted-foreground">{labelFor(field)}</dt>
            <dd className="text-sm font-medium">{sampleValue(field, i)}</dd>
          </div>
        ))}
      </dl>
    </Shell>
  );
}

function CreateScreen({
  screen,
  entity,
  state,
}: {
  screen: ScreenSpec;
  entity?: EntitySpec;
  state: PreviewState;
}) {
  const fields = (entity?.fields ?? []).filter((f) => !f.system && f.type !== "link");

  return (
    <Shell title={screen.name} back>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="text-sm font-medium">
              {labelFor(field)}
              {field.required ? null : (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  optional
                </span>
              )}
            </label>
            <div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
              {field.type === "status" ? STATUSES[0] : sampleValue(field, 0)}
            </div>
          </div>
        ))}

        {state === "error" ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            That didn&apos;t save. Nothing was charged — try again.
          </p>
        ) : null}

        <span className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
          Save
        </span>
      </div>
    </Shell>
  );
}

function AuthScreen({ state }: { state: PreviewState }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
        <div className="mt-5 space-y-3">
          <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
            you@example.com
          </div>
          <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
            ••••••••
          </div>
          {state === "error" ? (
            <p className="text-sm text-destructive">
              That email and password don&apos;t match. Try again.
            </p>
          ) : null}
          <span className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({ screen }: { screen: ScreenSpec }) {
  return (
    <Shell title={screen.name} action="Invite">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {NAMES.slice(0, 4).map((name, i) => (
          <li key={name} className="flex items-center justify-between bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">
                {name.split(" ")[0].toLowerCase()}@example.com
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {["Admin", "Manager", "Member", "Member"][i]}
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function ReportScreen({ screen, state }: { screen: ScreenSpec; state: PreviewState }) {
  if (state === "empty") {
    return (
      <Shell title={screen.name}>
        <Empty thing="numbers" action="Connect your data" />
      </Shell>
    );
  }
  if (state === "loading") {
    return (
      <Shell title={screen.name}>
        <Loading />
      </Shell>
    );
  }
  return (
    <Shell title={screen.name}>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["This month", "£4,280"],
          ["Booked", "17"],
          ["Awaiting", "3"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-32 items-end gap-1.5 rounded-xl border border-border bg-card p-4">
        {[40, 65, 30, 80, 55, 70, 95, 45].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </Shell>
  );
}

function SettingsScreen({ screen }: { screen: ScreenSpec }) {
  return (
    <Shell title={screen.name}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {[
          ["Email me when something changes", true],
          ["Show amounts including tax", false],
          ["Use a dark theme", true],
        ].map(([label, on], i) => (
          <div
            key={String(label)}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3",
              i > 0 && "border-t border-border"
            )}
          >
            <span className="text-sm">{label}</span>
            <span
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5",
                on ? "justify-end bg-primary" : "justify-start bg-muted"
              )}
            >
              <span className="size-4 rounded-full bg-background" />
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function ScreenPreview({
  app,
  screen,
  state,
}: {
  app: AppSpec;
  screen: ScreenSpec;
  state: PreviewState;
}) {
  const entity = entityOf(app, screen);

  switch (screen.kind) {
    case "auth":
      return <AuthScreen state={state} />;
    case "list":
      return <ListScreen screen={screen} entity={entity} state={state} />;
    case "detail":
      return <DetailScreen screen={screen} entity={entity} state={state} />;
    case "create":
      return <CreateScreen screen={screen} entity={entity} state={state} />;
    case "admin":
      return <AdminScreen screen={screen} />;
    case "report":
      return <ReportScreen screen={screen} state={state} />;
    default:
      return <SettingsScreen screen={screen} />;
  }
}
