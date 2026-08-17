import { plural, platformLabel, scaleLabel } from "@/lib/loom/brief";
import { enabledScreens, primaryOf, type AppSpec } from "@/lib/loom/app";
import { FONT_STACKS, PRESETS, RADIUS_STEPS } from "@/lib/loom/theme";
import { SCREEN_STATES } from "@/lib/loom/app";
import type { Brief, Task } from "@/lib/loom/types";
import type { Area, Decision } from "./types";

export type IncomingDecision = Omit<Decision, "id" | "status">;

/** Where a concern belongs when it becomes a decision other agents read. */
const AREA_FOR_TAG: Record<string, Area> = {
  scope: "product",
  audience: "product",
  adoption: "product",
  trust: "product",
  "stated-worry": "product",
  identity: "data",
  data: "data",
  migration: "data",
  permissions: "ux",
  flows: "ux",
  onboarding: "ux",
  feedback: "ux",
  "empty-state": "ux",
  errors: "ux",
  screens: "ux",
  ia: "ux",
  concurrency: "ux",
  offline: "technical",
  platform: "technical",
};

/**
 * Everything the app knows for certain, in a shape another agent can read.
 *
 * Only things a human actually settled — the interview, the answers to Loom's
 * questions, and the design choices they made. Findings the reviews raised are
 * not decisions; they're open questions, and recording them as genetics would
 * tell the next agent something was decided when it wasn't.
 */
export function genetics(input: {
  brief: Brief;
  app: AppSpec;
  tasks: Task[];
  /** Task id -> the designer's answer. */
  answers: Record<string, string>;
}): IncomingDecision[] {
  const { brief, app, tasks, answers } = input;
  const out: IncomingDecision[] = [];
  const at = Date.now();

  const add = (
    subject: string,
    area: Area,
    statement: string,
    why: string
  ) => {
    if (!statement.trim()) return;
    out.push({ subject, area, statement: statement.trim(), why, madeBy: "human", at });
  };

  // --- product -------------------------------------------------------------
  add(
    "product.what",
    "product",
    brief.product,
    "The one-line description everything else is measured against."
  );
  add(
    "product.who",
    "product",
    brief.who || brief.actorPlural,
    "Who this is for. Design decisions that suit a different person are wrong here, however good they are."
  );
  add(
    "product.job",
    "product",
    brief.job,
    "The single thing the product must do. Anything that doesn't serve it isn't in the first version."
  );
  add(
    "product.out-of-scope",
    "product",
    brief.outOfScope,
    "Deliberately not being built. Adding any of it back is a decision, not an oversight."
  );
  add(
    "product.readiness",
    "product",
    scaleLabel(brief.scale),
    "How finished the first version has to be. Changes how much hardening is worth doing."
  );

  // --- technical -----------------------------------------------------------
  add(
    "technical.platforms",
    "technical",
    brief.platforms.map(platformLabel).join(", ") || "Web",
    "Where it runs. Mobile targets bring offline and native conventions with them."
  );

  // --- visual --------------------------------------------------------------
  const preset = PRESETS.find((p) => p.id === app.theme.preset);
  add(
    "visual.palette",
    "visual",
    preset
      ? `${preset.label} — hue ${app.theme.primaryHue}, chroma ${app.theme.primaryChroma}`
      : `Custom — hue ${app.theme.primaryHue}, chroma ${app.theme.primaryChroma}`,
    preset?.note ??
      "The main colour, used for anything people are meant to press. Everything else is derived from it."
  );
  add(
    "visual.corners",
    "visual",
    RADIUS_STEPS.find((r) => r.value === app.theme.radius)?.label ??
      `${app.theme.radius}rem`,
    "Corner radius across the whole app. Softer reads friendlier, sharper reads more serious."
  );
  add(
    "visual.type",
    "visual",
    `${FONT_STACKS[app.theme.fontSans].label} for text, ${FONT_STACKS[app.theme.fontMono].label} for anything aligned in columns`,
    "The typefaces. Changing these changes every screen."
  );

  // --- data ----------------------------------------------------------------
  const primary = primaryOf(app);
  add(
    "data.primary-record",
    "data",
    primary.name,
    "The thing the app is mostly about. The main screens are built around it."
  );

  for (const entity of app.entities) {
    add(
      `data.${entity.id}`,
      "data",
      entity.fields.map((f) => `${f.name}${f.required ? "" : "?"}`).join(", "),
      `What a ${entity.name.toLowerCase()} keeps. Every screen showing one reads this list, so adding to it later means revisiting those screens.`
    );
  }

  // --- ux ------------------------------------------------------------------
  for (const screen of enabledScreens(app)) {
    const states = screen.states
      .map(
        (s) => SCREEN_STATES.find((x) => x.value === s)?.label.toLowerCase() ?? s
      )
      .join(", ");
    add(
      `ux.screen.${screen.id}`,
      "ux",
      `${screen.name} at ${screen.route}${states ? ` — must handle: ${states}` : ""}`,
      screen.custom
        ? "Added by the designer. No review has looked at it."
        : screen.note.replace(/^./, (c) => c.toUpperCase()) + ".",
    );
  }

  add(
    "ux.screen-set",
    "ux",
    enabledScreens(app)
      .map((s) => s.route)
      .join(", "),
    `Every screen in the app. ${plural(primary.name)} is the home screen in practice.`
  );

  // --- the answers to Loom's own questions ---------------------------------
  for (const task of tasks) {
    const answer = answers[task.id];
    if (!answer || !task.question) continue;
    add(
      `decided.${task.tag}`,
      AREA_FOR_TAG[task.tag] ?? "ux",
      answer,
      `${task.question.ask} ${task.question.why}`
    );
  }

  return out;
}
