import type { Answers, Brief, ProductType } from "./types";

const TYPE_LABELS: Record<ProductType, string> = {
  consumer: "Consumer app",
  internal: "Internal tool",
  marketplace: "Marketplace",
  analytics: "Analytics & reporting",
  content: "Content & creation tool",
  devtool: "Developer tool",
};

const PLATFORM_LABELS: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  desktop: "Desktop",
  extension: "Browser extension",
};

const SCALE_LABELS: Record<string, string> = {
  prototype: "Prototype",
  mvp: "MVP for first users",
  production: "Production",
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "their",
  "our",
  "your",
  "my",
  "some",
  "any",
  "each",
  "and",
  "or",
  "plus",
  "also",
  "etc",
]);

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function singular(word: string) {
  const w = word.trim();
  if (w.length <= 3) return w;
  if (/ies$/i.test(w)) return w.slice(0, -3) + "y";
  if (/(ss|us|is|as)$/i.test(w)) return w;
  // Only drop "es" where the stem needs it — "classes" -> "class",
  // "dishes" -> "dish", "boxes" -> "box". A bare "-ses" is usually a plain
  // plural of a word ending in "e": "nurses" -> "nurse", not "nurs".
  if (/(sses|shes|ches|xes|zes)$/i.test(w)) return w.slice(0, -2);
  if (/s$/i.test(w)) return w.slice(0, -1);
  return w;
}

export function plural(word: string) {
  const w = word.trim();
  if (!w) return w;
  if (/s$/i.test(w)) return w;
  if (/y$/i.test(w) && !/[aeiou]y$/i.test(w)) return w.slice(0, -1) + "ies";
  if (/(ch|sh|x|z|s)$/i.test(w)) return w + "es";
  return w + "s";
}

/** Pull the nouns out of a free-text "what does it store" answer. */
export function entitiesFrom(data: string): string[] {
  const parts = data
    .split(/[,\n;]|\band\b|\bplus\b|\/|•|\|/gi)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const part of parts) {
    const words = part
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
    if (words.length === 0) continue;
    // Keep it to a short noun phrase — "shoot deposits" not a whole clause.
    const phrase = words.slice(-2).join(" ");
    const name = phrase
      .split(" ")
      .map((w, i, arr) => titleCase(i === arr.length - 1 ? singular(w) : w))
      .join(" ");
    if (name.length > 1 && !out.some((e) => e.toLowerCase() === name.toLowerCase())) {
      out.push(name);
    }
    if (out.length >= 7) break;
  }
  return out;
}

/** A usable singular noun phrase for the person using this thing. */
export function actorFrom(who: string): string {
  const first = who.split(/[,.\n]|\bwho\b|\bthat\b/i)[0]?.trim() ?? "";
  const cleaned = first.replace(/^(for|by|the|a|an)\s+/i, "").trim();
  if (!cleaned) return "the user";
  const words = cleaned.split(/\s+/).slice(0, 4);
  const last = words[words.length - 1];
  words[words.length - 1] = singular(last);
  return words.join(" ").toLowerCase();
}

export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim().replace(/[.!?]+$/, "");
}

/** Words a quoted phrase must never end on — they leave the reader hanging. */
const DANGLING =
  /\s+(a|an|the|and|or|but|of|to|for|with|without|that|which|who|whom|whose|in|on|at|by|from|as|if|when|while|so|because|their|its|his|her|your|our|my)$/i;

/**
 * Trim a free-text answer down to something that reads inside a sentence.
 *
 * Cuts at a clause boundary where there is one, because chopping at a word
 * boundary produces "…and the nurses who" — which reads as a bug rather than
 * a quote. Leaves no ellipsis, so a following dash or period doesn't collide.
 */
export function clause(text: string, max = 90): string {
  const s = firstSentence(text);
  if (s.length <= max) return s.toLowerCase();

  // Prefer to stop where the sentence itself pauses.
  const head = s.slice(0, max + 1);
  const boundary = Math.max(
    head.lastIndexOf(", "),
    head.lastIndexOf("; "),
    head.lastIndexOf(" — "),
    head.lastIndexOf(" - ")
  );
  let cut =
    boundary > max * 0.45
      ? head.slice(0, boundary)
      : head.replace(/\s+\S*$/, "");

  // "…paid jobs a month and handle" — a conjunction with a single word after it
  // is always something we chopped in half. More than that is a real second
  // clause and worth keeping.
  cut = cut.replace(/\s+(and|or|but|plus)\s+\S+$/i, "");

  // Never leave the reader on a preposition or article.
  let previous = "";
  while (cut !== previous) {
    previous = cut;
    cut = cut.replace(DANGLING, "");
  }
  return cut.toLowerCase();
}

/** Same trim, but marked as truncated — for text shown inside quote marks. */
export function excerpt(text: string, max = 90): string {
  const s = firstSentence(text);
  if (s.length <= max) return s.toLowerCase();
  return clause(text, max) + "…";
}

/**
 * The first comma-delimited phrase, so quoting an answer mid-sentence doesn't
 * trail off in the middle of a list.
 */
export function phrase(text: string, max = 60): string {
  const first = firstSentence(text).split(/[,;]/)[0].trim();
  return clause(first, max);
}

export function deriveBrief(answers: Answers): Brief {
  const type = ((answers.type as ProductType) || "consumer") as ProductType;
  const platforms = (answers.platform ?? "web")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const actor = actorFrom(answers.who ?? "");
  const entities = entitiesFrom(answers.data ?? "");

  return {
    product: (answers.product ?? "").trim(),
    who: (answers.who ?? "").trim(),
    actor,
    actorPlural: plural(actor),
    job: (answers.job ?? "").trim(),
    type,
    typeLabel: TYPE_LABELS[type] ?? "App",
    today: (answers.today ?? "").trim(),
    entities: entities.length ? entities : ["Account", "Item"],
    worry: (answers.worry ?? "").trim(),
    platforms,
    mobile: platforms.includes("ios") || platforms.includes("android"),
    scale: answers.scale ?? "mvp",
    production: answers.scale === "production",
    outOfScope: (answers.outOfScope ?? "").trim(),
    extra: {
      firstRun: answers.firstRun ?? "",
      roles: answers.roles ?? "",
      supply: answers.supply ?? "",
      decision: answers.decision ?? "",
      authoring: answers.authoring ?? "",
      install: answers.install ?? "",
    },
  };
}

/** "A", "A and B", "A, B and C" — never "A and B and C". */
export function listOf(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function platformLabel(value: string) {
  return PLATFORM_LABELS[value] ?? value;
}

export function scaleLabel(value: string) {
  return SCALE_LABELS[value] ?? value;
}

const SLUG_STOP_WORDS = new Set([
  ...STOP_WORDS,
  "for",
  "of",
  "to",
  "in",
  "on",
  "with",
  "that",
  "this",
  "it",
  "is",
  "are",
  "by",
  "from",
]);

/** Short slug used for the workflow name and file prefixes. */
export function slugify(text: string, fallback = "project") {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !SLUG_STOP_WORDS.has(word))
    .slice(0, 3)
    .join("-");
  return slug || fallback;
}
