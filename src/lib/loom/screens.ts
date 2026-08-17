import { plural, singular } from "./brief";
import type { Brief } from "./types";

export type ScreenKind =
  | "auth"
  | "list"
  | "detail"
  | "create"
  | "admin"
  | "report"
  | "settings";

export interface Screen {
  id: string;
  name: string;
  kind: ScreenKind;
  /** App Router path this screen would live at. */
  route: string;
  /** What the screens review says about it. */
  note: string;
  /** Entity this screen is about, when it has one. */
  entity?: string;
}

/**
 * Nouns that name a person rather than a thing.
 *
 * Deliberately an explicit list rather than a suffix rule: "-er" would catch
 * Order, Folder and Reminder, and getting this wrong picks the wrong subject
 * for the entire app. Domain roles matter — a rota app lists "nurses" first and
 * is still about shifts.
 */
const PERSON_WORDS = [
  "user", "account", "member", "profile", "person", "people", "owner", "admin",
  "team", "staff", "employee", "worker", "manager", "customer", "client",
  "contact", "lead", "candidate", "applicant", "subscriber", "attendee",
  "participant", "visitor", "guest", "host", "seller", "buyer", "vendor",
  "nurse", "doctor", "clinician", "patient", "student", "pupil", "teacher",
  "tutor", "driver", "rider", "tenant", "landlord", "artist", "photographer",
  "developer", "designer", "author", "editor", "coach", "athlete", "player",
];

/** Does this entity name a person? */
export function isPersonLike(name: string): boolean {
  const words = singular(name).toLowerCase().split(/\s+/);
  return words.some((w) => PERSON_WORDS.includes(singular(w)));
}

/**
 * The thing the product is actually about.
 *
 * Not simply the first entity listed — people tend to name themselves first
 * ("photographers, clients, shoots"), but the screens are about the work, not
 * the worker. Prefer the first entity that isn't a person; fall back to the
 * first one if they all are.
 */
export function primaryEntity(brief: Brief): string {
  const actorWords = brief.actor.split(/\s+/);
  const thing = brief.entities.find(
    (e) =>
      !isPersonLike(e) &&
      !actorWords.some((w) => w.length > 3 && e.toLowerCase().includes(w))
  );
  return thing ?? brief.entities[0];
}

function routeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The screens this product needs, derived once and shared by the screens
 * review, the task list, and the scaffold — so all three agree on what exists.
 */
export function screenInventory(brief: Brief): Screen[] {
  const primary = primaryEntity(brief);
  const secondary = brief.entities.find((e) => e !== primary);
  const primarySlug = routeSlug(plural(primary));
  const screens: Screen[] = [];

  if (brief.scale !== "prototype") {
    screens.push({
      id: "auth",
      name: "Sign in / claim account",
      kind: "auth",
      route: "/sign-in",
      note: "the first thing between them and value",
    });
  }

  screens.push({
    id: `${primarySlug}-list`,
    name: plural(primary),
    kind: "list",
    route: `/${primarySlug}`,
    note: "the list, and the home screen in practice",
    entity: primary,
  });

  screens.push({
    id: `${primarySlug}-detail`,
    name: `${primary} detail`,
    kind: "detail",
    route: `/${primarySlug}/[id]`,
    note: `everything about one ${primary.toLowerCase()}`,
    entity: primary,
  });

  screens.push({
    id: `${primarySlug}-create`,
    name: `New ${primary.toLowerCase()}`,
    kind: "create",
    route: `/${primarySlug}/new`,
    note: "the primary flow lives here",
    entity: primary,
  });

  if (secondary) {
    const secondarySlug = routeSlug(plural(secondary));
    screens.push({
      id: `${secondarySlug}-list`,
      name: plural(secondary),
      kind: "list",
      route: `/${secondarySlug}`,
      note: `referenced by ${primary.toLowerCase()}, but nothing in the brief says where these get created`,
      entity: secondary,
    });
  }

  if (brief.type === "internal") {
    screens.push({
      id: "admin",
      name: "Admin",
      kind: "admin",
      route: "/admin",
      note: "roles, membership, and everything nobody wanted to design",
    });
  }

  if (brief.type === "analytics") {
    screens.push({
      id: "report",
      name: "Report detail",
      kind: "report",
      route: "/reports/[id]",
      note: "the number, and hopefully the action next to it",
    });
  }

  screens.push({
    id: "settings",
    name: "Settings",
    kind: "settings",
    route: "/settings",
    note: "currently a holding pen for undecided questions",
  });

  return screens;
}

/** Field names a generated type gets, based on what the entity looks like. */
export function fieldsFor(entity: string, brief: Brief): [string, string][] {
  const name = singular(entity);
  const fields: [string, string][] = [
    ["id", "string"],
    ["createdAt", "number"],
  ];

  // One shared notion of "is this a person", so the type, the owner field and
  // the choice of subject can't disagree with each other.
  const isPerson = isPersonLike(name) || brief.actor.includes(name.toLowerCase());

  if (isPerson) {
    fields.push(["name", "string"], ["email", "string"]);
  } else {
    fields.push(["title", "string"]);
  }

  if (/deposit|payment|invoice|order|fee|price|charge/i.test(name)) {
    fields.push(["amountCents", "number"], ["status", "PaymentStatus"]);
  } else if (!isPerson) {
    fields.push(["status", `${name}Status`]);
  }

  // Everything that isn't the identity entity needs an owner. The data model
  // review flags exactly this when it's missing.
  const owner = brief.entities.find((e) => isPersonLike(e));
  if (!isPerson) {
    fields.push([`${(owner ?? brief.entities[0]).toLowerCase()}Id`, "string"]);
  }

  return fields;
}
