import type { PlainVars } from "./plain";

/**
 * The questions Loom asks when it doesn't know something.
 *
 * A decision the app never hears the answer to isn't a decision — it's a
 * checkbox. Every open concern gets a real question, and answering it is how
 * the designer actually designs the thing.
 *
 * Suggested answers are the honest options, not a quiz with a right answer.
 * Each one says what it costs, because that's the part people get wrong.
 */
export interface AnswerOption {
  /** What you'd choose. */
  label: string;
  /** What choosing it means, including what it costs. */
  consequence: string;
}

export interface OpenQuestion {
  ask: string;
  /** Why Loom needs to know, in one line. */
  why: string;
  options: AnswerOption[];
  /** Shown above the free-text box when there are no options worth listing. */
  hint?: string;
}

const QUESTIONS: Record<string, OpenQuestion> = {
  identity: {
    ask: "Who owns a {thing}?",
    why: "Everything about sharing, permissions and deleting hangs off this one answer.",
    options: [
      {
        label: "One person owns it",
        consequence:
          "Simplest to build. Gets awkward the first time someone wants a colleague to look at one.",
      },
      {
        label: "A team shares it",
        consequence:
          "More natural for work, but you now need to build teams, invites and roles.",
      },
      {
        label: "Anyone with the link can see it",
        consequence:
          "No accounts needed to view. Also means a forwarded link is a leak.",
      },
    ],
  },
  permissions: {
    ask: "Someone opens a {thing} that isn't theirs. What do they see?",
    why: "Old links get forwarded. Whatever you don't decide here, the code decides for you.",
    options: [
      {
        label: "“You can't see this”",
        consequence:
          "Honest and easy to understand. Confirms the thing exists, which is sometimes a leak in itself.",
      },
      {
        label: "“Not found”",
        consequence:
          "Gives nothing away. Slightly confusing for someone who genuinely should have access.",
      },
      {
        label: "Everyone can see everything",
        consequence:
          "Fine inside a small trusted team. Not fine the day you add your first outside client.",
      },
    ],
  },
  scope: {
    ask: "If you had to pick one person this is for, who is it?",
    why: "Designing for two different people at once usually means pleasing neither.",
    options: [],
    hint: "Name the person who hits this problem most often, and what makes them different from the next person over.",
  },
  audience: {
    ask: "What's better in the first five minutes than what they do today?",
    why: "Switching costs them something now and pays off later. This is the part that gets declined.",
    options: [],
    hint: "Not the long-term benefit — the thing they'd notice in the first session.",
  },
  "stated-worry": {
    ask: "You said this worried you. How do you want to handle it?",
    why: "The reviews found it too. Better to decide on purpose than to leave it hanging.",
    options: [
      {
        label: "Design for it now",
        consequence:
          "It shapes the first version. Slower to build, but you won't be retrofitting trust later.",
      },
      {
        label: "Accept it for now, and write down why",
        consequence:
          "Perfectly reasonable — as long as it's a decision rather than an oversight.",
      },
    ],
  },
  data: {
    ask: "Someone deletes a {thing}. What happens to everything attached to it?",
    why: "This is the most common way apps lose people's work.",
    options: [
      {
        label: "Refuse while anything still points at it",
        consequence:
          "Nothing is ever lost. People will hit “you can't delete this” and be annoyed.",
      },
      {
        label: "Keep a marker where it used to be",
        consequence:
          "History stays readable. You need to design what that marker looks like on every screen.",
      },
      {
        label: "Delete everything with it",
        consequence:
          "Clean and predictable. One wrong tap can take a lot with it, so it needs a confirmation.",
      },
    ],
  },
  migration: {
    ask: "How do {actors} get the work they already have into this?",
    why: "They won't retype it. If there's no way in, the old way stays alive alongside yours.",
    options: [
      {
        label: "Upload a file",
        consequence: "Handles real volume. Messy data will need cleaning up on the way in.",
      },
      {
        label: "Paste it in",
        consequence: "Much quicker to build and covers most people. Breaks down past a few dozen rows.",
      },
      {
        label: "They start fresh",
        consequence: "Nothing to build. Their first session is data entry, which is where people quit.",
      },
    ],
  },
  offline: {
    ask: "They lose signal halfway through. What happens?",
    why: "On a phone this is normal, not rare.",
    options: [
      {
        label: "Save a draft and finish when it's back",
        consequence: "Best experience. The most work, and you have to handle conflicts later.",
      },
      {
        label: "Stop and tell them clearly",
        consequence: "Honest and simple. They lose what they'd typed unless you keep it on screen.",
      },
      {
        label: "Assume they're online",
        consequence: "Nothing to build. It will fail in front of a real person fairly soon.",
      },
    ],
  },
  concurrency: {
    ask: "Two people change the same thing at once. Who wins?",
    why: "Without an answer, one person's work vanishes and nobody is told.",
    options: [
      {
        label: "Last save wins, and tell the other person",
        consequence: "Easy to build and honest. Someone still loses work, they just find out.",
      },
      {
        label: "Lock it while someone's editing",
        consequence: "Nothing gets lost. People get blocked by a colleague who wandered off.",
      },
      {
        label: "It won't happen",
        consequence: "Fine if one person owns each thing. Two open tabs is the same problem.",
      },
    ],
  },
  errors: {
    ask: "Something fails. What do you want them to do?",
    why: "“Try again” and “this will never work” need different words.",
    options: [
      {
        label: "Try again themselves",
        consequence: "Right for network blips. Frustrating if the thing is genuinely broken.",
      },
      {
        label: "Get in touch with you",
        consequence: "Nothing gets silently dropped. Every failure becomes a message in your inbox.",
      },
      {
        label: "Carry on, and you'll fix it behind the scenes",
        consequence: "Feels smooth. You need somewhere those failures actually land.",
      },
    ],
  },
  "empty-state": {
    ask: "The list is empty. What does it say?",
    why: "This is everyone's first screen, and it's the best chance you get to explain the app.",
    options: [],
    hint: "Write the actual words. What is a {thing} for, and what happens after they add the first one?",
  },
  onboarding: {
    ask: "What does someone see in their first minute, before they've added anything?",
    why: "If the good bit needs their data, a new person never sees it.",
    options: [],
    hint: "It has to work on a completely empty account.",
  },
  feedback: {
    ask: "How does someone know it worked?",
    why: "The moment it finishes isn't the moment they believe it.",
    options: [
      { label: "A message on the screen", consequence: "Immediate. Gone the second they navigate away." },
      { label: "An email", consequence: "They keep a record. Slower, and email is easy to miss." },
      { label: "It just appears in their list", consequence: "Quiet and clean. Some people won't be sure it saved." },
    ],
  },
  adoption: {
    ask: "What brings {actors} back on the day the problem happens again?",
    why: "The first visit is the easy one.",
    options: [
      { label: "You send them something", consequence: "Reliable. Needs a reason to send, or it's spam." },
      { label: "It's already part of their routine", consequence: "The strongest kind. Hard to engineer." },
      { label: "Someone else pulls them back in", consequence: "Grows on its own. Only works once there's more than one person." },
    ],
  },
  trust: {
    ask: "At the moment something's at stake, what reassures them?",
    why: "Trust is what the product does when money or personal details are involved.",
    options: [],
    hint: "Think about the exact second before they press the button.",
  },
  platform: {
    ask: "What has to feel native, rather than like a website in an app?",
    why: "People compare your app to everything else on their phone, not to your other screens.",
    options: [],
  },
  screens: {
    ask: "In one sentence, what is this screen for?",
    why: "A screen without a job collects whatever didn't fit elsewhere.",
    options: [],
  },
  ia: {
    ask: "Where would someone expect to find this?",
    why: "If there's no obvious home it ends up in settings.",
    options: [],
  },
  flows: {
    ask: "Walk through the main job once. Where would you get stuck?",
    why: "The steps that aren't written down are the ones that break.",
    options: [],
  },
};

const FALLBACK: OpenQuestion = {
  ask: "What's your call on this?",
  why: "The reviews raised it and it hasn't been settled.",
  options: [],
};

function fill(text: string, vars: PlainVars): string {
  return text
    .replace(/\{thing\}/g, vars.thing)
    .replace(/\{things\}/g, vars.things)
    .replace(/\{actors\}/g, vars.actors)
    .replace(/\{actor\}/g, vars.actor);
}

export function questionFor(tag: string, vars: PlainVars): OpenQuestion {
  const base = QUESTIONS[tag] ?? FALLBACK;
  return {
    ask: fill(base.ask, vars),
    why: fill(base.why, vars),
    hint: base.hint ? fill(base.hint, vars) : undefined,
    options: base.options.map((o) => ({
      label: fill(o.label, vars),
      consequence: fill(o.consequence, vars),
    })),
  };
}
