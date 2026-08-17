import { plural, singular } from "./brief";
import { enabledScreens, primaryOf, type AppSpec } from "./app";
import { plainFor, type PlainVars } from "./plain";
import { questionFor } from "./questions";
import type {
  Brief,
  Finding,
  Severity,
  Milestone,
  MilestoneId,
  Task,
  TaskKind,
  TaskSize,
  TaskStatus,
} from "./types";

export const MILESTONES: Milestone[] = [
  {
    id: "decide",
    title: "Decide",
    blurb:
      "Questions with no code attached. Every one of these has other work waiting behind it, so answering them is the highest-leverage hour of the project.",
  },
  {
    id: "foundation",
    title: "Foundation",
    blurb: "Types, storage, and the shape everything else reads and writes.",
  },
  {
    id: "core",
    title: "Core flow",
    blurb:
      "The one thing the product must do, end to end, plus the screens it passes through.",
  },
  {
    id: "states",
    title: "States",
    blurb:
      "Empty, loading, error, permission-denied. Usually 40% of the screens and always the part that gets cut.",
  },
  {
    id: "harden",
    title: "Harden",
    blurb: "What breaks when the product meets people you haven't met.",
  },
];

/** Where a concern lands in the build, and what kind of work it is. */
const ROUTING: Record<
  string,
  { milestone: MilestoneId; kind: TaskKind; size: TaskSize }
> = {
  scope: { milestone: "decide", kind: "decide", size: "S" },
  identity: { milestone: "decide", kind: "decide", size: "S" },
  permissions: { milestone: "decide", kind: "decide", size: "M" },
  "stated-worry": { milestone: "decide", kind: "decide", size: "M" },
  audience: { milestone: "decide", kind: "decide", size: "S" },
  data: { milestone: "foundation", kind: "build", size: "M" },
  migration: { milestone: "foundation", kind: "build", size: "L" },
  flows: { milestone: "core", kind: "build", size: "L" },
  onboarding: { milestone: "states", kind: "design", size: "M" },
  feedback: { milestone: "states", kind: "design", size: "S" },
  "empty-state": { milestone: "states", kind: "design", size: "M" },
  errors: { milestone: "states", kind: "design", size: "M" },
  screens: { milestone: "states", kind: "design", size: "M" },
  ia: { milestone: "states", kind: "design", size: "S" },
  offline: { milestone: "harden", kind: "build", size: "L" },
  concurrency: { milestone: "harden", kind: "build", size: "L" },
  platform: { milestone: "harden", kind: "build", size: "M" },
  trust: { milestone: "harden", kind: "design", size: "M" },
  adoption: { milestone: "harden", kind: "design", size: "M" },
};

/**
 * Which concern has to be settled before another can be worked on. These are
 * the same orderings the checker reported as cross-review dependencies — the
 * places where doing the work in the wrong order means doing it twice.
 */
const GATES: Record<string, string[]> = {
  identity: ["permissions", "screens"],
  scope: ["audience", "adoption", "onboarding"],
  audience: ["adoption"],
  data: ["screens"],
  migration: ["data"],
  errors: ["feedback"],
  "empty-state": ["onboarding"],
  offline: ["platform"],
};

const FALLBACK = {
  milestone: "core" as MilestoneId,
  kind: "build" as TaskKind,
  size: "M" as TaskSize,
};

/** A finding says what's wrong. A task says what to do about it. */
function verbFor(kind: TaskKind, title: string): string {
  if (kind === "decide") return `Decide: ${title.replace(/^The /, "the ")}`;
  if (kind === "design") return `Design: ${title.replace(/^The /, "the ")}`;
  return `Build: ${title.replace(/^The /, "the ")}`;
}

/**
 * Turn the spec into a backlog.
 *
 * Two sources feed it: the findings (what the reviews said to fix) and the
 * construction plan (the screens and types the product needs regardless). They
 * interleave by milestone, so the list reads as one build rather than a fix
 * list bolted onto a plan.
 */
export function compileTasks(
  brief: Brief,
  findings: Finding[],
  app: AppSpec
): Task[] {
  const tasks: Task[] = [];
  const primary = primaryOf(app);
  const vars: PlainVars = {
    thing: singular(primary.name).toLowerCase(),
    things: plural(primary.name).toLowerCase(),
    actor: brief.actor,
    actors: brief.actorPlural,
  };

  // --- fixes the reviews asked for -----------------------------------------
  // Grouped by concern, not one task per finding. Two reviews both saying the
  // permission model is undecided are describing one decision, and listing it
  // twice under the same plain-language heading reads as a bug.
  const byConcern = new Map<string, Finding[]>();
  for (const finding of findings) {
    const tag = finding.tags[0] ?? "flows";
    const group = byConcern.get(tag);
    if (group) group.push(finding);
    else byConcern.set(tag, [finding]);
  }

  const rank: Record<Severity, number> = { critical: 0, medium: 1, low: 2 };

  for (const [tag, group] of byConcern) {
    const route = ROUTING[tag] ?? FALLBACK;
    const sorted = [...group].sort(
      (a, b) => rank[a.severity] - rank[b.severity]
    );
    const worst = sorted[0];
    // A critical concern is never small work.
    const size: TaskSize =
      worst.severity === "critical" && route.size === "S" ? "M" : route.size;

    tasks.push({
      id: `fix-${tag}`,
      title: verbFor(route.kind, worst.title),
      detail: sorted
        .map((f) => `**${f.title}** — ${f.detail}`)
        .join("\n\n"),
      plain: plainFor(tag, vars),
      question: questionFor(tag, vars),
      milestone: route.milestone,
      kind: route.kind,
      size,
      source: "finding",
      from: [...new Set(sorted.map((f) => f.node))].join(", "),
      severity: worst.severity,
      tag,
      blockedBy: [],
    });
  }

  // --- the build itself ----------------------------------------------------
  const screens = enabledScreens(app);

  for (const entity of app.entities) {
    tasks.push({
      id: `type-${entity.id}`,
      title: `Decide what you keep about each ${entity.name.toLowerCase()}`,
      detail: `Fields, and which of them are required at creation time. The scaffold generates a starting point — the part it can't know is which fields are optional until the ${entity.name.toLowerCase()} is complete.`,
      plain: {
        what: `List what you need to know about a ${entity.name.toLowerCase()}.`,
        why: `Every screen showing a ${entity.name.toLowerCase()} reads this list. Adding to it later means revisiting each of those screens.`,
        done: `You can name each thing you keep about a ${entity.name.toLowerCase()}, and say which of them you can't do without.`,
      },
      milestone: "foundation",
      kind: "build",
      size: "S",
      source: "plan",
      tag: "data",
      blockedBy: [],
    });
  }

  tasks.push({
    id: "storage",
    title: `Set up somewhere to keep ${app.entities.length} kinds of record`,
    detail:
      "The scaffold puts every read and write behind one module, so swapping the in-memory stub for a real database touches one file rather than every screen.",
    plain: {
      what: "Give the app somewhere to actually save things.",
      why: "Until this exists, everything you add disappears the moment the page reloads.",
      done: "Something you create is still there tomorrow.",
    },
    milestone: "foundation",
    kind: "build",
    size: "M",
    source: "plan",
    tag: "data",
    blockedBy: [],
  });

  tasks.push({
    id: "primary-flow",
    title: `Make the main job work start to finish`,
    detail: `${brief.job || "The primary job"} — from arriving to seeing confirmation, with a real record at the end of it.`,
    plain: plainFor("flows", vars),
    milestone: "core",
    kind: "build",
    size: "L",
    source: "plan",
    tag: "flows",
    blockedBy: [],
  });

  for (const screen of screens) {
    const entity = app.entities.find((e) => e.id === screen.entityId);
    tasks.push({
      id: `screen-${screen.id}`,
      title: `Build the ${screen.name.toLowerCase()} screen`,
      detail: `${screen.note.replace(/^./, (c) => c.toUpperCase())}.${
        entity ? ` Reads and writes ${plural(entity.name).toLowerCase()}.` : ""
      } Lives at ${screen.route}.`,
      plain: {
        what: `Build the ${screen.name.toLowerCase()} screen.`,
        why: screen.custom
          ? "You added this one yourself, so no review has looked at it — worth deciding what it's for before you build it."
          : `${screen.note.replace(/^./, (c) => c.toUpperCase())}.`,
        done: `You can open ${screen.route} and it does what its name says${
          screen.states.length
            ? `, including when there's nothing to show`
            : ""
        }.`,
      },
      milestone: "core",
      kind: "build",
      size: screen.kind === "create" ? "L" : "M",
      source: "plan",
      tag: screen.kind === "auth" ? "identity" : "screens",
      blockedBy: entity ? [`type-${entity.id}`] : [],
    });
  }

  // --- what blocks what ----------------------------------------------------
  // Only work that settles a concern gates other work — building the sign-in
  // screen doesn't settle the permission model, the decision about it does.
  // And gating only ever points forward through the milestones.
  const order = Object.fromEntries(
    MILESTONES.map((m, i) => [m.id, i])
  ) as Record<MilestoneId, number>;

  return tasks.map((task) => {
    const gating = tasks
      .filter(
        (other) =>
          other.id !== task.id &&
          other.source === "finding" &&
          order[other.milestone] <= order[task.milestone] &&
          // Something that gates this task's concern...
          (GATES[other.tag]?.includes(task.tag) ||
            // ...or an open decision about the very same concern.
            (other.milestone === "decide" &&
              task.milestone !== "decide" &&
              other.tag === task.tag))
      )
      .map((other) => other.id);

    const blockedBy = [...new Set([...task.blockedBy, ...gating])].filter(
      (id) => id !== task.id
    );
    return { ...task, blockedBy };
  });
}

export function statusOf(
  task: Task,
  statuses: Record<string, TaskStatus>
): TaskStatus {
  return statuses[task.id] ?? "todo";
}

/** A task is blocked while anything it depends on is unfinished. */
export function blockersOf(
  task: Task,
  tasks: Task[],
  statuses: Record<string, TaskStatus>
): Task[] {
  return task.blockedBy
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t && statusOf(t, statuses) !== "done");
}

export function tasksIn(tasks: Task[], milestone: MilestoneId): Task[] {
  const order = { review: 0, decide: 1, design: 2, build: 3 } as const;
  const severity = { critical: 0, medium: 1, low: 2 } as const;
  return tasks
    .filter((t) => t.milestone === milestone)
    .sort((a, b) => {
      // Plan work first — you can't fix a screen that doesn't exist yet.
      const bySource = Number(a.source === "finding") - Number(b.source === "finding");
      if (bySource !== 0) return bySource;
      const bySeverity =
        (a.severity ? severity[a.severity] : 3) -
        (b.severity ? severity[b.severity] : 3);
      if (bySeverity !== 0) return bySeverity;
      return order[a.kind] - order[b.kind];
    });
}

export function progressOf(
  tasks: Task[],
  statuses: Record<string, TaskStatus>
): { done: number; doing: number; total: number } {
  let done = 0;
  let doing = 0;
  for (const task of tasks) {
    const status = statusOf(task, statuses);
    if (status === "done") done += 1;
    if (status === "doing") doing += 1;
  }
  return { done, doing, total: tasks.length };
}

export const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};
