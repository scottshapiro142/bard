/**
 * Everything the app says to the person using it, in words that don't need a
 * developer to interpret them.
 *
 * Written per *concern* rather than per finding: there are ~19 concerns and
 * many more findings, so this stays consistent and any future finding inherits
 * plain language from its tag automatically.
 */

export interface PlainVars {
  /** The main thing the app is about, singular and lowercase. "shoot" */
  thing: string;
  /** Plural. "shoots" */
  things: string;
  /** Who uses it, singular. "freelance photographer" */
  actor: string;
  /** Plural. */
  actors: string;
}

export interface PlainText {
  /** What you're doing. An instruction, not a diagnosis. */
  what: string;
  /** Why it matters — always in terms of a real person using the app. */
  why: string;
  /** How you'd know it's finished. */
  done: string;
}

const PLAIN: Record<string, PlainText> = {
  scope: {
    what: "Pin down who this is for.",
    why: "Right now it could be two different people who want opposite things. Design for both and you'll please neither.",
    done: "You can name the one person you're building for, and say what makes them different from the next person over.",
  },
  identity: {
    what: "Decide who owns each {thing}.",
    why: "Until this is answered, nothing can say whose {things} these are. You can't build sharing, and you can't safely let anyone delete anything.",
    done: "For any {thing}, you can say exactly who it belongs to and who else can see it.",
  },
  permissions: {
    what: "Decide who's allowed to do what.",
    why: "Sooner or later someone lands on a screen that isn't theirs — an old link, a forwarded URL. What they see then is currently undecided, and undecided usually means they see it.",
    done: "Every screen has an answer for each kind of person: use it, read it, or be told no.",
  },
  "stated-worry": {
    what: "Face the thing you said worried you.",
    why: "You raised it before any review had run, and the reviews landed on it independently. That's about as strong a signal as you get.",
    done: "You've either designed for it, or written down why you're accepting the risk.",
  },
  audience: {
    what: "Work out why someone would switch to this.",
    why: "{actors} already have a way of doing this. Switching costs them something today and pays off later, which is a hard trade to ask for.",
    done: "You can say what's better in the first five minutes — not eventually.",
  },
  data: {
    what: "Settle what you keep, and what happens when it goes.",
    why: "Every screen reads this. Change your mind later and you change every screen with it.",
    done: "You can list what a {thing} holds, and say what happens to everything attached to it when one is deleted.",
  },
  migration: {
    what: "Get their existing work in.",
    why: "{actors} already have this written down somewhere. If they have to retype it, their first session is a chore — and they'll keep the old way running alongside yours.",
    done: "There's a way in. An import, or even just a paste box.",
  },
  flows: {
    what: "Make the main job work start to finish.",
    why: "This is the thing people came to do. If any step of it can fail quietly, they'll find out at the worst possible moment.",
    done: "You can walk through it once as a real person and get a real result — and you know what happens when each step fails.",
  },
  onboarding: {
    what: "Make the first minute land.",
    why: "On a first visit there's nothing in the app yet. If the good bit needs their information, they never get to see it.",
    done: "Someone who has just arrived, with nothing saved, still sees something worth coming back for.",
  },
  feedback: {
    what: "Tell people what just happened.",
    why: "The moment the system finishes isn't the moment they believe it. The gap between those two is where people press the button a second time.",
    done: "Every action someone takes says something back.",
  },
  "empty-state": {
    what: "Design the screen before anything's on it.",
    why: "This is what every single person sees on their first visit — the most-seen screen in the whole app, and usually the last one anybody designs.",
    done: "The empty version of each list does the work of showing someone what to do next.",
  },
  errors: {
    what: "Decide what people see when it breaks.",
    why: "It will break. Right now they'd see whatever the system happens to say, and that's the difference between something that feels finished and something that doesn't.",
    done: "Every failure has words a person can read, and says whether trying again would help.",
  },
  screens: {
    what: "Sort out what this screen is responsible for.",
    why: "A screen that owns nothing collects leftovers; a screen that owns too much becomes where everything goes wrong.",
    done: "You can say in one sentence what this screen is for.",
  },
  ia: {
    what: "Tidy up where things live.",
    why: "When something has no obvious home it ends up in settings — and settings becomes the place decisions go to be forgotten.",
    done: "Someone could guess where to find each thing without being shown.",
  },
  offline: {
    what: "Decide what happens with no signal.",
    why: "On a phone, losing connection halfway through isn't unusual — it's a Tuesday. If the main job can't survive a tunnel, it'll fail in front of real people.",
    done: "Losing connection is a designed moment rather than a surprise.",
  },
  concurrency: {
    what: "Decide what happens when two people edit the same thing.",
    why: "Whoever saves second wins, and the first person's work disappears without anyone being told. From where they're sitting, the app lost their work.",
    done: "You've picked what happens, and whoever lost out gets told.",
  },
  platform: {
    what: "Make it feel at home where it runs.",
    why: "People don't compare your app to your other screens. They compare it to everything else on their phone.",
    done: "Going back, moving around, and the main action all behave the way they do everywhere else on that device.",
  },
  trust: {
    what: "Earn the trust this is asking for.",
    why: "You're asking people to hand over something that matters — money, or details they can't take back. Trust isn't a feature you add; it's what the product does at the moment something's at stake.",
    done: "Wherever something's at risk, the person can see what's happening and what happens if it goes wrong.",
  },
  adoption: {
    what: "Give people a reason to come back.",
    why: "The first visit is the easy one. Nothing currently brings {actors} back on the day the problem happens again.",
    done: "You can name the thing that puts this in front of them at the right moment.",
  },
  "feedback-note": {
    what: "Act on what you found when you tried it.",
    why: "You used it and something was off. That's the most direct evidence you'll get about this app.",
    done: "You've been back through it and it works the way you wanted.",
  },
};

const FALLBACK: PlainText = {
  what: "Work through this one.",
  why: "It came out of the reviews and hasn't been dealt with yet.",
  done: "You're happy with how it behaves.",
};

function fill(text: string, vars: PlainVars): string {
  return text
    .replace(/\{thing\}/g, vars.thing)
    .replace(/\{things\}/g, vars.things)
    .replace(/\{actors\}/g, vars.actors)
    .replace(/\{actor\}/g, vars.actor);
}

export function plainFor(tag: string, vars: PlainVars): PlainText {
  const base = PLAIN[tag] ?? FALLBACK;
  return {
    what: fill(base.what, vars),
    why: fill(base.why, vars),
    done: fill(base.done, vars),
  };
}

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

/**
 * Every technical word the app puts in front of someone, defined plainly. Used
 * by the <Term> tooltips and by the generated glossary page — one source, so a
 * definition can't be right in one place and wrong in the other.
 */
export const GLOSSARY: Record<string, string> = {
  "empty state":
    "What a screen looks like when there's nothing on it yet. It's what everyone sees on their first visit.",
  route:
    "The web address of a screen — the part after the domain, like /shoots or /settings.",
  record:
    "One saved thing. One booking, one customer, one invoice. A list screen shows many; a detail screen shows one.",
  field:
    "One piece of information on a record — a name, a date, an amount.",
  entity:
    "A kind of record. 'Shoot' is an entity; a particular Tuesday booking is one record of it.",
  state:
    "A version of a screen for a particular situation: nothing here yet, still loading, something went wrong.",
  flow:
    "The path someone takes to get one thing done, from arriving to being finished.",
  scaffold:
    "The starting code this generates. Not a finished app — the parts that can be worked out from your answers.",
  "design system":
    "The set of colours, corner shapes and type your app uses everywhere, so screens look like they belong together.",
  token:
    "One named value in your design system, like your main colour. Change it once and everything using it changes.",
  contrast:
    "How far apart two colours are in lightness. Text needs enough of it to be readable — 4.5 to 1 is the usual minimum.",
  checkpoint:
    "A moment where a piece of the app is finished and it's your turn to try it and say what you think.",
  milestone:
    "A stage of the build. Things are grouped so the decisions come before the work that depends on them.",
  blocked:
    "Waiting on something else. You can't sensibly do this one until the thing before it is settled.",
  spec: "The written description of what you're building and what still needs deciding.",
  checker:
    "The step that read every review at once and found the problems that only show up when you see them together.",
  finding: "One problem a review found, with why it matters.",
  critical:
    "Other work depends on this. Leave it and you'll redo things later.",
  component:
    "A reusable piece of interface — a button, a card — used across many screens so they stay consistent.",
};

export function glossaryTerm(term: string): string | undefined {
  return GLOSSARY[term.toLowerCase()];
}
