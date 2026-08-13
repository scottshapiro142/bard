import type { Answers, Question } from "./types";

/**
 * The interview. One question at a time, in the order a good design lead would
 * ask them: what, who, what job, then the specifics that change the shape of
 * the work. Later questions branch on the product type.
 */
export const QUESTIONS: Question[] = [
  {
    id: "product",
    prompt: "What are you building?",
    helper:
      "One or two sentences. Say what it does, not what category it's in.",
    placeholder:
      "A booking tool for freelance photographers — clients pick a slot, pay a deposit, and get a shoot brief.",
    kind: "textarea",
    unlocks: "all",
  },
  {
    id: "who",
    prompt: "Who is it for?",
    helper:
      "Name a role, not a demographic. \"Freelance photographers who shoot weddings\" beats \"creatives.\"",
    placeholder: "Freelance photographers who book 2–6 shoots a month on their own.",
    kind: "textarea",
    unlocks: "audience",
  },
  {
    id: "job",
    prompt: "What's the one thing a user must be able to do?",
    helper:
      "If they could only do this and nothing else, would it still be worth opening? That's the primary flow.",
    placeholder: "Send a client a link that takes a deposit and locks a date.",
    kind: "textarea",
    unlocks: "flows",
  },
  {
    id: "type",
    prompt: "What shape is it?",
    helper: "This decides which reviews run in parallel.",
    kind: "choice",
    options: [
      {
        value: "consumer",
        label: "Consumer app",
        hint: "People find it themselves and decide in the first minute",
      },
      {
        value: "internal",
        label: "Internal tool",
        hint: "A team is told to use it; roles and permissions matter",
      },
      {
        value: "marketplace",
        label: "Marketplace",
        hint: "Two sides that need each other to show up",
      },
      {
        value: "analytics",
        label: "Analytics or reporting",
        hint: "Someone looks at it and then does something",
      },
      {
        value: "content",
        label: "Content or creation tool",
        hint: "People make things in it — drafts, versions, publishing",
      },
      {
        value: "devtool",
        label: "Developer tool",
        hint: "It has to get into an existing workflow",
      },
    ],
    unlocks: "type",
  },
  {
    id: "today",
    prompt: "How do they solve this today?",
    helper:
      "The workaround you're replacing. Usually a spreadsheet, a group chat, or nothing.",
    placeholder:
      "A Google Sheet, back-and-forth DMs, and a Venmo request they chase for two weeks.",
    kind: "textarea",
    unlocks: "audience",
  },

  // ---- branch: one question that only makes sense for this product shape ----
  {
    id: "firstRun",
    prompt: "What has to happen in the first 60 seconds?",
    helper:
      "Before they've entered any data. If the answer needs their data, you have an activation problem.",
    placeholder:
      "They see a real booking page with their name on it and can copy the link.",
    kind: "textarea",
    when: (a) => a.type === "consumer",
    unlocks: "first_run",
  },
  {
    id: "roles",
    prompt: "Who has permission to do what?",
    helper:
      "List the roles and the one thing each can do that the others can't.",
    placeholder:
      "Admins add people and see billing. Managers approve requests. Everyone else files them.",
    kind: "textarea",
    when: (a) => a.type === "internal",
    unlocks: "roles",
  },
  {
    id: "supply",
    prompt: "Which side is harder to get, and why?",
    helper:
      "Then: what does the easy side see on day one, when the hard side is empty?",
    placeholder:
      "Photographers. They already have clients and no reason to move. Clients only show up if a photographer sends them.",
    kind: "textarea",
    when: (a) => a.type === "marketplace",
    unlocks: "liquidity",
  },
  {
    id: "decision",
    prompt: "What does someone do after looking at it?",
    helper:
      "Name the decision and the action. A number nobody acts on is a screensaver.",
    placeholder:
      "They see which package under-earns and change its price before next season.",
    kind: "textarea",
    when: (a) => a.type === "analytics",
    unlocks: "decision_loop",
  },
  {
    id: "authoring",
    prompt: "What's the lifecycle of a thing someone makes?",
    helper: "Draft, edit, share, publish, undo. Say which of those exist.",
    placeholder:
      "Draft brief → shared with client → client comments → locked when the deposit clears.",
    kind: "textarea",
    when: (a) => a.type === "content",
    unlocks: "authoring",
  },
  {
    id: "install",
    prompt: "How does it get into their workflow the first time?",
    helper: "The first command, click, or paste. Be literal.",
    placeholder: "npx create-x, then paste a key into .env.local.",
    kind: "textarea",
    when: (a) => a.type === "devtool",
    unlocks: "adoption",
  },

  {
    id: "data",
    prompt: "What does the app hold onto?",
    helper:
      "The main things it stores. Comma-separated is fine — these become your data model.",
    placeholder: "Photographers, clients, shoots, deposits, briefs",
    kind: "textarea",
    unlocks: "data_model",
  },
  {
    id: "platform",
    prompt: "Where does it run?",
    helper: "Pick everything that ships in v1.",
    kind: "multi",
    options: [
      { value: "web", label: "Web" },
      { value: "ios", label: "iOS" },
      { value: "android", label: "Android" },
      { value: "desktop", label: "Desktop" },
      { value: "extension", label: "Browser extension" },
    ],
    unlocks: "platform_native",
  },
  {
    id: "scale",
    prompt: "How finished does v1 need to be?",
    kind: "choice",
    options: [
      {
        value: "prototype",
        label: "Prototype",
        hint: "Shown in a room, not shipped",
      },
      {
        value: "mvp",
        label: "MVP for first users",
        hint: "Real people, small numbers, you're watching",
      },
      {
        value: "production",
        label: "Production",
        hint: "Strangers use it unsupervised",
      },
    ],
    unlocks: "scale_risk",
  },
  {
    id: "worry",
    prompt: "What are you most worried about getting wrong?",
    helper:
      "The thing you'd want a second opinion on. The checker looks for this in every review.",
    placeholder:
      "That photographers won't trust us to hold a client's deposit.",
    kind: "textarea",
    unlocks: "checker",
  },
  {
    id: "outOfScope",
    prompt: "What are you deliberately not building in v1?",
    helper:
      "Naming this now is what keeps the spec from quietly growing later.",
    placeholder: "Contracts, invoicing, anything after the shoot happens.",
    kind: "textarea",
    optional: true,
    unlocks: "summary",
  },
];

/** The questions that actually apply, given what's been answered so far. */
export function resolveQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.when || q.when(answers));
}

export function isAnswered(q: Question, answers: Answers): boolean {
  const value = (answers[q.id] ?? "").trim();
  return q.optional ? true : value.length > 0;
}

/** How far through the interview we are, as a 0–1 fraction. */
export function interviewProgress(answers: Answers): number {
  const qs = resolveQuestions(answers);
  const done = qs.filter((q) => (answers[q.id] ?? "").trim().length > 0).length;
  return qs.length === 0 ? 0 : done / qs.length;
}

export function firstUnansweredIndex(answers: Answers): number {
  const qs = resolveQuestions(answers);
  const idx = qs.findIndex((q) => (answers[q.id] ?? "").trim().length === 0);
  return idx === -1 ? qs.length - 1 : idx;
}
