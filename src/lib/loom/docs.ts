import { plural, scaleLabel, platformLabel, singular } from "./brief";
import { enabledScreens, primaryOf, type AppSpec, type Field } from "./app";
import { FIELD_TYPES, SCREEN_STATES } from "./app";
import { GLOSSARY } from "./plain";
import { FONT_STACKS, PRESETS, resolveTheme } from "./theme";
import { MILESTONES } from "./tasks";
import type { Feature } from "./features";
import type { Brief, FeedbackNote, Finding, Task, TaskStatus } from "./types";

export interface DocPage {
  path: string;
  title: string;
  /** One line, for the contents list. */
  summary: string;
  body: string;
}

function shortType(field: Field, app: AppSpec): string {
  if (field.type === "link") {
    const target = app.entities.find(
      (e) => e.id === field.name.replace(/Id$/, "").toLowerCase()
    );
    return target
      ? `points at a ${target.name.toLowerCase()}`
      : "points at another record you keep";
  }
  return FIELD_TYPES.find((t) => t.value === field.type)?.short ?? "";
}

function labelFor(field: Field): string {
  return field.name
    .replace(/Id$/, "")
    .replace(/Cents$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

export interface DocInput {
  brief: Brief;
  app: AppSpec;
  findings: Finding[];
  tasks: Task[];
  features: Feature[];
  statuses: Record<string, TaskStatus>;
  feedback: FeedbackNote[];
  leafCount: number;
  designerName: string;
  /** Task id -> what the designer actually answered. */
  decisions: Record<string, string>;
}

/**
 * The handbook.
 *
 * Written for whoever picks this up — the designer, someone they report to, or
 * a developer who wasn't in the room. Same voice throughout: no sentence should
 * need a developer to interpret it.
 */
export function generateDocs(input: DocInput): DocPage[] {
  const { brief, app, findings, tasks, features, decisions } = input;
  const primary = primaryOf(app);
  const thing = singular(primary.name).toLowerCase();
  const things = plural(primary.name).toLowerCase();
  const screens = enabledScreens(app);

  const pages: DocPage[] = [];

  // -------------------------------------------------------------------------
  pages.push({
    path: "docs/01-what-were-building.md",
    title: "What we're building",
    summary: "The product in a paragraph, and the one thing it has to do.",
    body: [
      `# What we're building`,
      ``,
      brief.product || "—",
      ``,
      `## The one thing it has to do`,
      ``,
      brief.job
        ? `**${brief.job.replace(/\.$/, "")}.**`
        : `Not yet decided — which is worth fixing before anything else.`,
      ``,
      `Everything in here serves that. If a screen or a feature doesn't help someone do it, it isn't part of the first version.`,
      ``,
      `## Where it runs`,
      ``,
      `${brief.platforms.map(platformLabel).join(" and ") || "The web"}. We're building it to be ${scaleLabel(brief.scale).toLowerCase()}.`,
      ``,
      `## What we're deliberately not building`,
      ``,
      brief.outOfScope ||
        "Nothing has been ruled out yet. That's worth doing — an unbounded first version tends to grow until it never ships.",
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  pages.push({
    path: "docs/02-who-its-for.md",
    title: "Who it's for",
    summary: "The person we're designing for, and what they do today instead.",
    body: [
      `# Who it's for`,
      ``,
      brief.actorPlural.replace(/^./, (c) => c.toUpperCase()) + ".",
      ``,
      brief.who ? `In their own words from the interview: "${brief.who}"` : "",
      ``,
      `## What they do today`,
      ``,
      brief.today
        ? `${brief.today}\n\nThis is the real competition. It's free, it already has their information in it, and it works well enough that they've kept using it. Anything we build has to beat it in the first five minutes, not eventually.`
        : `Nothing was recorded. Worth finding out — whatever workaround they've built is the thing we're actually competing with.`,
      ``,
      `## What we're not sure about`,
      ``,
      brief.worry
        ? `Before any review had run, the worry was: "${brief.worry}"`
        : `No particular worry was raised at the start.`,
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  const flowLines = [
    `Someone arrives — from a link, a bookmark, or a search.`,
    brief.job ? `They ${brief.job.replace(/\.$/, "").toLowerCase()}.` : `They do the main job.`,
    `A ${thing} is saved.`,
    `They see confirmation that it worked.`,
  ];

  pages.push({
    path: "docs/03-how-it-works.md",
    title: "How it works",
    summary: "The main path through the app, and every screen in it.",
    body: [
      `# How it works`,
      ``,
      `## The main path`,
      ``,
      ...flowLines.map((line, i) => `${i + 1}. ${line}`),
      ``,
      `## The screens`,
      ``,
      ...screens.flatMap((screen) => [
        `### ${screen.name}`,
        ``,
        `At \`${screen.route}\`. ${screen.note.replace(/^./, (c) => c.toUpperCase())}.`,
        ``,
        screen.states.length
          ? `It also has to handle: ${screen.states
              .map(
                (state) =>
                  SCREEN_STATES.find((s) => s.value === state)?.label.toLowerCase() ??
                  state
              )
              .join(", ")}.`
          : `No special situations recorded for this one.`,
        ``,
      ]),
      `## Situations every screen has to handle`,
      ``,
      ...SCREEN_STATES.map((s) => `- **${s.label}** — ${s.plain}`),
      ``,
      `These are usually about 40% of the work and they're the part that gets cut when time runs short. They're also what separates something that feels finished from something that doesn't.`,
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  pages.push({
    path: "docs/04-what-we-store.md",
    title: "What the app remembers",
    summary: "Every kind of record, in plain terms, and what it keeps.",
    body: [
      `# What the app remembers`,
      ``,
      `The app keeps ${app.entities.length} kinds of record. Everything on every screen comes from one of these.`,
      ``,
      ...app.entities.flatMap((entity) => {
        const own = entity.fields.filter((f) => !f.system);
        const automatic = entity.fields.filter((f) => f.system);
        return [
          `## ${entity.name}`,
          ``,
          entity.id === primary.id
            ? `The thing this app is mostly about. For each ${thing} we keep:`
            : `For each ${entity.name.toLowerCase()} we keep:`,
          ``,
          ...own.map(
            (field) =>
              `- **${labelFor(field)}**${
                field.required ? "" : " *(optional)*"
              } — ${shortType(field, app)}`
          ),
          automatic.length
            ? `\nAlongside that, the app fills in ${automatic
                .map((f) => `**${labelFor(f)}**`)
                .join(" and ")} on its own — you never type those.`
            : ``,
          ``,
        ];
      }),
      `## When something is deleted`,
      ``,
      `Deleting one ${thing} affects everything attached to it. There are three honest answers — refuse while anything still points at it, keep a marker where it used to be, or remove everything with it — and the app currently refuses to guess. Whoever builds this needs a decision.`,
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  // Every question Loom asked, wherever it ended up in the plan.
  const asked = tasks.filter((t) => t.question);
  const answered = asked.filter((t) => decisions[t.id]);
  const open = asked.filter((t) => !decisions[t.id]);

  pages.push({
    path: "docs/05-what-you-decided.md",
    title: "What was decided, and what's still open",
    summary: "The questions this project ran into, and where each one stands.",
    body: [
      `# What was decided, and what's still open`,
      ``,
      `${answered.length} of ${asked.length} questions have an answer. Anything still open is a decision waiting to be made, not something forgotten.`,
      ``,
      answered.length ? `## Settled` : ``,
      ``,
      ...answered.flatMap((task) => [
        `### ${task.question?.ask ?? task.plain.what}`,
        ``,
        `**You said:** ${decisions[task.id]}`,
        ``,
        task.question?.why ?? task.plain.why,
        ``,
      ]),
      open.length ? `## Still open` : ``,
      ``,
      ...open.flatMap((task) => [
        `### ${task.question?.ask ?? task.plain.what}`,
        ``,
        task.question?.why ?? task.plain.why,
        ``,
        task.question?.options.length
          ? `The options, and what each costs:\n\n${task.question.options
              .map((o) => `- **${o.label}** — ${o.consequence}`)
              .join("\n")}`
          : `**You'll know it's settled when:** ${task.plain.done.replace(/^./, (c) => c.toLowerCase())}`,
        ``,
      ]),
      asked.length === 0 ? `Nothing outstanding.\n` : ``,
      `## What you said after trying it`,
      ``,
      input.feedback.length === 0
        ? `Nothing yet. Once a part of the app is finished you'll be asked to try it, and whatever you say lands here.`
        : input.feedback
            .map((note) => {
              const feature = features.find((f) => f.id === note.featureId);
              return `- On ${feature?.title.toLowerCase() ?? "the app"}: "${note.text}"`;
            })
            .join("\n"),
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  const preset = PRESETS.find((p) => p.id === app.theme.preset);
  const resolved = resolveTheme(app.theme);
  const failing = resolved.contrast.filter((c) => !c.passes);

  pages.push({
    path: "docs/06-the-look-and-feel.md",
    title: "The look and feel",
    summary: "The colours, shapes and type the app uses, and what each is for.",
    body: [
      `# The look and feel`,
      ``,
      `Every screen draws from one small set of choices, so they look like they belong together. Change one of these and everything using it changes at once.`,
      ``,
      `## The choices`,
      ``,
      `- **Main colour** — ${preset ? `${preset.label}. ${preset.note}` : "custom."} It's used for anything you're meant to press, and for anything the app wants you to notice.`,
      `- **Corners** — ${app.theme.radius === 0 ? "square" : `${app.theme.radius}rem of rounding`}. Softer corners read as friendlier; sharper ones read as more serious.`,
      `- **Type** — ${FONT_STACKS[app.theme.fontSans].label} for everything you read, ${FONT_STACKS[app.theme.fontMono].label} for anything you'd want lined up in columns.`,
      ``,
      `## Readability`,
      ``,
      failing.length === 0
        ? `Every text and background pair we check clears the usual minimum of 4.5 to 1, in both light and dark. That means people can read it in bright sun and at night.`
        : `${failing.length} pair${failing.length === 1 ? "" : "s"} of colours ${
            failing.length === 1 ? "is" : "are"
          } harder to read than the usual minimum of 4.5 to 1:\n\n${failing
            .map((c) => `- **${c.label}** (${c.where}) — ${c.ratio} to 1`)
            .join("\n")}\n\nThat doesn't make it unusable, but some people won't be able to read it comfortably.`,
      ``,
      `## Where this lives in the code`,
      ``,
      `\`globals.css\` in the generated code holds all of it. It's the standard shadcn setup, so anything built with shadcn will pick these up automatically.`,
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  const criticals = findings.filter((f) => f.severity === "critical").length;
  const converged = findings.filter((f) => (f.alsoIn?.length ?? 0) > 0).length;

  pages.push({
    path: "docs/07-how-this-was-built.md",
    title: "How this plan was put together",
    summary: "Where the list of work came from, and why it's in this order.",
    body: [
      `# How this plan was put together`,
      ``,
      `This wasn't one opinion. ${input.leafCount} separate reviews looked at the idea at the same time, each at one thing only — who it's for, the main path through it, the screens, what gets stored, and the situations nobody designs for.`,
      ``,
      `None of them could see each other's work. That's deliberate: it means when two of them land on the same problem independently, it's a real signal rather than one reviewer repeating themselves.`,
      ``,
      `## What came out`,
      ``,
      `- ${findings.length} things worth doing something about.`,
      `- ${criticals} of them are the kind that block other work.`,
      `- ${converged} were raised by more than one review, and were treated as more serious because of it.`,
      ``,
      `## Why the order is what it is`,
      ``,
      `Some work can't sensibly start until something else is settled. You can't design who's allowed to see a screen before you've decided who owns the thing on it. So the plan puts decisions first, then the foundations, then the main job, then the situations, then the things that only bite once strangers are using it.`,
      ``,
      `Where a task shows as blocked, that's what it means: it's waiting on a decision, not on someone's time.`,
      ``,
      `## The stages`,
      ``,
      ...MILESTONES.map((m) => `- **${m.title}** — ${m.blurb}`),
      ``,
    ].join("\n"),
  });

  // -------------------------------------------------------------------------
  pages.push({
    path: "docs/08-glossary.md",
    title: "Glossary",
    summary: "Every technical word this project uses, in plain terms.",
    body: [
      `# Glossary`,
      ``,
      `Words that come up in the app, the plan, or the code — explained without assuming you build software for a living.`,
      ``,
      ...Object.entries(GLOSSARY)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([term, meaning]) => `**${term}** — ${meaning}\n`),
      `## Words specific to this project`,
      ``,
      ...app.entities.map(
        (entity) =>
          `**${entity.name}** — ${
            entity.id === primary.id
              ? `the thing this app is mostly about. One ${thing}.`
              : `one of the ${plural(entity.name).toLowerCase()} the app keeps.`
          }\n`
      ),
      `**${things}** — more than one ${thing}.\n`,
      ``,
    ].join("\n"),
  });

  return pages;
}
