import { plural, singular } from "./brief";
import { fieldsFor, primaryEntity, screenInventory, type ScreenKind } from "./screens";
import { DEFAULT_THEME, type Theme } from "./theme";
import type { Brief } from "./types";

export type FieldType =
  | "text"
  | "number"
  | "money"
  | "date"
  | "yes-no"
  | "status"
  | "link";

export const FIELD_TYPES: {
  value: FieldType;
  label: string;
  /** For the picker — what choosing this means. */
  plain: string;
  /** For prose — reads after an em dash without repeating itself. */
  short: string;
}[] = [
  {
    value: "text",
    label: "Text",
    plain: "Words — a name, a note, an address.",
    short: "words you type in",
  },
  {
    value: "number",
    label: "Number",
    plain: "A count or a quantity.",
    short: "a number",
  },
  {
    value: "money",
    label: "Money",
    plain: "An amount. Stored in whole pennies so it can't round wrong.",
    short: "an amount of money, kept in whole pennies so it can't round wrong",
  },
  {
    value: "date",
    label: "Date & time",
    plain: "When something happens or happened.",
    short: "a date and time",
  },
  {
    value: "yes-no",
    label: "Yes / no",
    plain: "A switch. It's either on or it isn't.",
    short: "yes or no",
  },
  {
    value: "status",
    label: "Status",
    plain: "One of a short list of states, like draft or paid.",
    short: "one of a short list of states",
  },
  {
    value: "link",
    label: "Link to another record",
    plain: "Points at something else you store.",
    short: "points at another record you keep",
  },
];

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  /** Generated automatically. Shown, but not editable. */
  system?: boolean;
}

export interface EntitySpec {
  id: string;
  name: string;
  fields: Field[];
}

export type ScreenState = "empty" | "loading" | "error" | "denied";

export const SCREEN_STATES: { value: ScreenState; label: string; plain: string }[] = [
  { value: "empty", label: "Nothing here yet", plain: "What someone sees before they've added anything. Everyone's first visit." },
  { value: "loading", label: "Still loading", plain: "The moment before the screen has its information." },
  { value: "error", label: "Something went wrong", plain: "When it fails, and what they can do about it." },
  { value: "denied", label: "Not allowed", plain: "When someone reaches a screen that isn't theirs." },
];

export interface ScreenSpec {
  id: string;
  name: string;
  kind: ScreenKind;
  route: string;
  /** What a review said about this screen. Tied to the id, so renaming keeps it. */
  note: string;
  entityId?: string;
  states: ScreenState[];
  enabled: boolean;
  /** Added by the designer rather than derived from the interview. */
  custom?: boolean;
}

export interface AppSpec {
  entities: EntitySpec[];
  screens: ScreenSpec[];
  theme: Theme;
  primaryEntityId: string;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Map the generated TypeScript type back to something a designer can pick. */
function fieldTypeFor(name: string, tsType: string): FieldType {
  if (/amount|price|fee|total/i.test(name)) return "money";
  if (/at$|date|when/i.test(name)) return "date";
  if (tsType.endsWith("Status")) return "status";
  if (/Id$/.test(name)) return "link";
  if (tsType === "number") return "number";
  return "text";
}

/** Which states a screen of this kind is actually capable of showing. */
function statesFor(kind: ScreenKind): ScreenState[] {
  if (kind === "list") return ["empty", "loading", "error"];
  if (kind === "detail") return ["loading", "error", "denied"];
  if (kind === "create") return ["error"];
  if (kind === "report") return ["empty", "loading"];
  return ["loading"];
}

/**
 * The starting point: everything the interview and the reviews implied, turned
 * into something the designer can then change.
 *
 * Derivation stays in `screens.ts` so the screens review keeps reading the
 * interview rather than the designer's later edits.
 */
export function deriveAppSpec(brief: Brief): AppSpec {
  const entities: EntitySpec[] = brief.entities.map((name) => ({
    id: slugify(name),
    name,
    fields: fieldsFor(name, brief).map(([fieldName, tsType]) => ({
      id: slugify(fieldName),
      name: fieldName,
      type: fieldTypeFor(fieldName, tsType),
      required: fieldName !== "status",
      system: fieldName === "id" || fieldName === "createdAt",
    })),
  }));

  const screens: ScreenSpec[] = screenInventory(brief).map((screen) => ({
    id: screen.id,
    name: screen.name,
    kind: screen.kind,
    route: screen.route,
    note: screen.note,
    entityId: screen.entity ? slugify(screen.entity) : undefined,
    states: statesFor(screen.kind),
    enabled: true,
  }));

  return {
    entities,
    screens,
    theme: DEFAULT_THEME,
    primaryEntityId: slugify(primaryEntity(brief)),
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function entityOf(app: AppSpec, screen: ScreenSpec): EntitySpec | undefined {
  return app.entities.find((e) => e.id === screen.entityId);
}

export function primaryOf(app: AppSpec): EntitySpec {
  return (
    app.entities.find((e) => e.id === app.primaryEntityId) ?? app.entities[0]
  );
}

export function enabledScreens(app: AppSpec): ScreenSpec[] {
  return app.screens.filter((s) => s.enabled);
}

export function displayField(entity: EntitySpec | undefined): Field | undefined {
  if (!entity) return undefined;
  return (
    entity.fields.find((f) => f.name === "name") ??
    entity.fields.find((f) => f.name === "title") ??
    entity.fields.find((f) => !f.system)
  );
}

// ---------------------------------------------------------------------------
// Editing — every one returns a new AppSpec
// ---------------------------------------------------------------------------

export function renameScreen(app: AppSpec, id: string, name: string): AppSpec {
  return {
    ...app,
    screens: app.screens.map((s) => (s.id === id ? { ...s, name } : s)),
  };
}

export function setScreenRoute(app: AppSpec, id: string, route: string): AppSpec {
  const clean = route.startsWith("/") ? route : `/${route}`;
  return {
    ...app,
    screens: app.screens.map((s) => (s.id === id ? { ...s, route: clean } : s)),
  };
}

export function toggleScreen(app: AppSpec, id: string): AppSpec {
  return {
    ...app,
    screens: app.screens.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ),
  };
}

export function toggleScreenState(
  app: AppSpec,
  id: string,
  state: ScreenState
): AppSpec {
  return {
    ...app,
    screens: app.screens.map((s) =>
      s.id === id
        ? {
            ...s,
            states: s.states.includes(state)
              ? s.states.filter((x) => x !== state)
              : [...s.states, state],
          }
        : s
    ),
  };
}

export function addScreen(
  app: AppSpec,
  input: { name: string; kind: ScreenKind; entityId?: string }
): AppSpec {
  const base = slugify(input.name) || "screen";
  let id = base;
  let n = 2;
  while (app.screens.some((s) => s.id === id)) id = `${base}-${n++}`;

  return {
    ...app,
    screens: [
      ...app.screens,
      {
        id,
        name: input.name,
        kind: input.kind,
        route: `/${base}`,
        note: "added by you, so no review has looked at it yet",
        entityId: input.entityId,
        states: statesFor(input.kind),
        enabled: true,
        custom: true,
      },
    ],
  };
}

export function removeScreen(app: AppSpec, id: string): AppSpec {
  return { ...app, screens: app.screens.filter((s) => s.id !== id) };
}

export function updateField(
  app: AppSpec,
  entityId: string,
  fieldId: string,
  patch: Partial<Omit<Field, "id">>
): AppSpec {
  return {
    ...app,
    entities: app.entities.map((entity) =>
      entity.id === entityId
        ? {
            ...entity,
            fields: entity.fields.map((field) =>
              field.id === fieldId ? { ...field, ...patch } : field
            ),
          }
        : entity
    ),
  };
}

export function addField(app: AppSpec, entityId: string): AppSpec {
  return {
    ...app,
    entities: app.entities.map((entity) => {
      if (entity.id !== entityId) return entity;
      const base = "newField";
      let id = slugify(base);
      let n = 2;
      while (entity.fields.some((f) => f.id === id)) id = `${slugify(base)}-${n++}`;
      return {
        ...entity,
        fields: [
          ...entity.fields,
          { id, name: `field${entity.fields.length + 1}`, type: "text", required: false },
        ],
      };
    }),
  };
}

export function removeField(
  app: AppSpec,
  entityId: string,
  fieldId: string
): AppSpec {
  return {
    ...app,
    entities: app.entities.map((entity) =>
      entity.id === entityId
        ? { ...entity, fields: entity.fields.filter((f) => f.id !== fieldId) }
        : entity
    ),
  };
}

export function setTheme(app: AppSpec, theme: Theme): AppSpec {
  return { ...app, theme };
}

// ---------------------------------------------------------------------------
// Naming helpers shared by the preview, the codegen and the docs
// ---------------------------------------------------------------------------

export function pascal(name: string) {
  return singular(name)
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function camel(name: string) {
  const p = pascal(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

export function pluralName(name: string) {
  return plural(name);
}

/** The TypeScript type a field compiles to. */
export function tsTypeFor(field: Field, entityName: string): string {
  switch (field.type) {
    case "number":
    case "money":
    case "date":
      return "number";
    case "yes-no":
      return "boolean";
    case "status":
      return `${pascal(entityName)}Status`;
    case "link":
      return "string";
    default:
      return "string";
  }
}
