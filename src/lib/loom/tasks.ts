import { plural } from "./brief";
import { screenInventory } from "./screens";
import type {
  Brief,
  Finding,
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

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
}

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
export function compileTasks(brief: Brief, findings: Finding[]): Task[] {
  const tasks: Task[] = [];

  // --- fixes the reviews asked for -----------------------------------------
  for (const finding of findings) {
    const tag = finding.tags[0] ?? "flows";
    const route = ROUTING[tag] ?? FALLBACK;
    // A critical finding is never smaller than medium-sized work.
    const size: TaskSize =
      finding.severity === "critical" && route.size === "S" ? "M" : route.size;

    tasks.push({
      id: `fix-${slug(finding.title)}`,
      title: verbFor(route.kind, finding.title),
      detail: finding.detail,
      milestone: route.milestone,
      kind: route.kind,
      size,
      source: "finding",
      from: finding.node,
      severity: finding.severity,
      tag,
      blockedBy: [],
    });
  }

  // --- the build itself ----------------------------------------------------
  const screens = screenInventory(brief);

  for (const entity of brief.entities) {
    tasks.push({
      id: `type-${slug(entity)}`,
      title: `Define the ${entity} type`,
      detail: `Fields, and which of them are required at creation time. The scaffold generates a starting point — the part it can't know is which fields are optional until the ${entity.toLowerCase()} is complete.`,
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
    title: `Wire up storage for ${brief.entities.length} record types`,
    detail:
      "The scaffold puts every read and write behind one module, so swapping the in-memory stub for a real database touches one file rather than every screen.",
    milestone: "foundation",
    kind: "build",
    size: "M",
    source: "plan",
    tag: "data",
    blockedBy: [],
  });

  tasks.push({
    id: "primary-flow",
    title: `Make the primary flow work end to end`,
    detail: `${brief.job || "The primary job"} — from arriving to seeing confirmation, with a real record at the end of it.`,
    milestone: "core",
    kind: "build",
    size: "L",
    source: "plan",
    tag: "flows",
    blockedBy: [],
  });

  for (const screen of screens) {
    tasks.push({
      id: `screen-${screen.id}`,
      title: `Build ${screen.name} (${screen.route})`,
      detail: `${screen.note.replace(/^./, (c) => c.toUpperCase())}.${
        screen.entity ? ` Reads and writes ${plural(screen.entity)}.` : ""
      }`,
      milestone: "core",
      kind: "build",
      size: screen.kind === "create" ? "L" : "M",
      source: "plan",
      tag: screen.kind === "auth" ? "identity" : "screens",
      blockedBy: screen.entity ? [`type-${slug(screen.entity)}`] : [],
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
  const order = { decide: 0, design: 1, build: 2 } as const;
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
