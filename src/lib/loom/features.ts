import { singular } from "./brief";
import { enabledScreens, primaryOf, type AppSpec } from "./app";
import type { Task } from "./types";

/**
 * A chunk of the app a person would recognise.
 *
 * Milestones ("States", "Harden") describe how the work is organised. Features
 * describe what the app does — "Signing in", "Adding a shoot". When something
 * is finished it's a feature that finished, so this is what a checkpoint is
 * raised against.
 */
export interface Feature {
  id: string;
  title: string;
  /** One sentence. What this part of the app is, to someone using it. */
  whatItIs: string;
  taskIds: string[];
  /** Only features you can actually open and try raise a checkpoint. */
  previewScreenId?: string;
}

/** Which feature a concern belongs to, when it isn't tied to a screen. */
const TAG_HOME: Record<string, "auth" | "list" | "create" | "store" | "ground"> = {
  identity: "auth",
  permissions: "auth",
  "empty-state": "list",
  screens: "list",
  ia: "list",
  errors: "create",
  feedback: "create",
  flows: "create",
  data: "store",
  migration: "store",
};

export function buildFeatures(app: AppSpec, tasks: Task[]): Feature[] {
  const primary = primaryOf(app);
  const thing = singular(primary.name).toLowerCase();
  const things = primary.name.toLowerCase().endsWith("s")
    ? primary.name.toLowerCase()
    : `${thing}s`;

  const screens = enabledScreens(app);
  const byKind = (kind: string) => screens.find((s) => s.kind === kind);

  const features: Feature[] = [];
  const add = (
    id: string,
    title: string,
    whatItIs: string,
    previewScreenId?: string
  ) => {
    features.push({ id, title, whatItIs, taskIds: [], previewScreenId });
  };

  const auth = byKind("auth");
  if (auth) {
    add(
      "auth",
      "Signing in",
      `How ${things === "items" ? "people" : "people"} get into the app and prove who they are.`,
      auth.id
    );
  }

  const list = byKind("list");
  if (list) {
    add(
      "list",
      `Finding your ${things}`,
      `The screen people land on. It shows every ${thing} they have — and, on day one, none.`,
      list.id
    );
  }

  const detail = byKind("detail");
  if (detail) {
    add(
      "detail",
      `Looking at one ${thing}`,
      `Everything about a single ${thing}, in one place.`,
      detail.id
    );
  }

  const create = byKind("create");
  if (create) {
    add(
      "create",
      `Adding a ${thing}`,
      `The main job. This is what people came to do, so it has to work even when something goes wrong partway through.`,
      create.id
    );
  }

  const admin = byKind("admin");
  if (admin) {
    add("admin", "Managing people", "Who's on the team and what each of them can do.", admin.id);
  }

  const report = byKind("report");
  if (report) {
    add(
      "report",
      "Seeing how things are going",
      "The numbers, and the thing you'd do about them.",
      report.id
    );
  }

  const settings = byKind("settings");
  if (settings) {
    add("settings", "Settings", "The handful of things people can change about how it works for them.", settings.id);
  }

  add(
    "store",
    "What the app remembers",
    `The information kept about each ${thing}, and what happens to it when something is deleted.`
  );

  add(
    "ground",
    "Decisions and groundwork",
    "Questions with no screen attached. Answering them unblocks the work waiting behind them."
  );

  const index = new Map(features.map((f) => [f.id, f]));
  const screenFeature = new Map<string, string>();
  for (const feature of features) {
    if (feature.previewScreenId) screenFeature.set(feature.previewScreenId, feature.id);
  }

  for (const task of tasks) {
    let target: string | undefined;

    // Tasks that already know where they belong — feedback and review tasks.
    if (task.featureId && index.has(task.featureId)) {
      target = task.featureId;
    }
    // Work that builds a specific screen belongs to that screen's feature.
    else if (task.id.startsWith("screen-")) {
      target = screenFeature.get(task.id.slice("screen-".length));
    } else if (task.id.startsWith("type-") || task.id === "storage") {
      target = "store";
    } else if (task.id === "primary-flow") {
      target = index.has("create") ? "create" : "ground";
    }

    if (!target) {
      const home = TAG_HOME[task.tag];
      if (home === "auth") target = index.has("auth") ? "auth" : "ground";
      else if (home === "list") target = index.has("list") ? "list" : "ground";
      else if (home === "create") target = index.has("create") ? "create" : "ground";
      else if (home === "store") target = "store";
    }

    index.get(target ?? "ground")?.taskIds.push(task.id);
  }

  // A feature with nothing in it isn't a feature.
  return features.filter((f) => f.taskIds.length > 0);
}

export function featureOf(features: Feature[], taskId: string): Feature | undefined {
  return features.find((f) => f.taskIds.includes(taskId));
}
