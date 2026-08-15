# Loom — Interview in. Graph out.

> A design review that isn't one opinion, hedged.

Loom is a tool for product designers. It interviews you about the app you're
designing, compiles your answers into a **workflow graph**, runs every review in
that graph independently and in parallel, hands back a prioritized spec — then
turns that spec into an app you build, theme and try without leaving the page.

## The idea it borrows

The paradigm comes from code review workflows written like this:

```yaml
workflow: code-review

nodes:
  review_auth:
    task: "Review auth.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_auth.md

  review_api:
    task: "Review api.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_api.md

  review_db:
    task: "Review db.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_db.md

  checker:
    task: "Read all three reviews. Flag issues appearing in more than
           one file. Note cross-file dependencies that could cause problems."
    depends_on: [review_auth, review_api, review_db]
    output: checker.md

  summary:
    task: "Write a prioritized fix list — critical first,
           then medium, then low."
    depends_on: [checker]
    output: final_review.md
```

Three reviews that can't see each other, a **checker** that reads all three at
once, and a **summary** that ranks what's left. The checker is the part that
earns its keep: it finds what no single reviewer could, because no single
reviewer had all the reviews in front of them.

Loom builds that same graph for a product design. The reviews are about
audiences, flows, screens, data and edge cases instead of files — and the graph
is written in exactly the format above, so you can copy it out and run it
anywhere else that speaks this shape.

## The five stages

| Stage | What happens |
| --- | --- |
| **Interview** | Up to eleven questions, one at a time. The set adapts — a marketplace gets asked about cold start, an internal tool about permissions. The graph assembles live in the sidebar as you answer. |
| **Graph** | Answers compile into nodes. Which reviews exist depends on what you said: mobile targets add a platform review, "going to production" adds a scale-risk review. Rendered as a diagram and as YAML. |
| **Run** | Every leaf review fires at the same moment. The checker is the only node that waits, because it's the only one that needs everything. |
| **Spec** | One prioritized document — critical, then medium, then low — plus every intermediate file the graph produced. |
| **Build** | A two-pane workspace: tasks, screens, theme, docs and code on the left, a live preview of your app on the right. Edit the app, theme it, work the list — and when a feature is finished, Loom hands it back to you to try. |

## What the checker actually does

It isn't decoration. Each review emits findings tagged with the concern they're
about (`empty-state`, `offline`, `permissions`, `identity`, `trust`, …). The
checker:

1. groups findings by concern and finds the ones **two or more independent
   reviews landed on** — that convergence is real signal, not a coincidence;
2. **raises the severity** of the strongest statement of each converging concern
   (only the lead one, so the priority list stays a pyramid instead of turning
   everything critical);
3. reports **cross-review dependencies** — the places where doing the work in
   the wrong order means doing it twice;
4. checks the thing you said in the interview you were worried about against
   what the reviews found independently, and tells you whether your instinct was
   confirmed or not.

That last one is the moment the paradigm pays off: reviews that never saw your
worry either corroborate it or they don't, and both answers are useful.

## Loom asks, and remembers

A decision the app never hears the answer to is just a checkbox. So Loom asks:

> **Someone opens a shoot that isn't theirs. What do they see?**
> Old links get forwarded. Whatever you don't decide here, the code decides for you.
>
> - **"You can't see this"** — Honest and easy to understand. Confirms the thing exists, which is sometimes a leak in itself.
> - **"Not found"** — Gives nothing away. Slightly confusing for someone who genuinely should have access.
> - **Everyone can see everything** — Fine inside a small trusted team. Not fine the day you add your first outside client.
>
> …or say it in your own words.

Every suggested answer says **what it costs**. There is no right one, and
pretending otherwise would make this a quiz rather than a conversation.

Answering settles the task, unblocks whatever was waiting behind it, and writes
your words into the handbook — so *"what was decided"* is a real record rather
than a list of unticked boxes.

## Keeping you in the loop

The build isn't a list you grind through alone. When every task in a feature is
done, Loom says so — by name, in plain words — and puts a task on *your* plate:

> **Scott — we just finished signing in.**
> Have a look and tell us whether it works the way you expected.
> *[Open it in the preview]  [Looks right]  [Needs work]*

"Open it in the preview" jumps the right-hand pane to that screen, which is why
the preview earns its place: it's where you do the testing the message asks for.
"Needs work" takes a note **in your own words** and turns it into a task that
quotes you — nobody paraphrases a complaint better than the person who has it.
Deal with it and the feature comes back for another look.

Checkpoints only fire for features you can actually open and try. Asking someone
to "test" a decision they made on paper would be theatre.

### Plain language, with the detail one click away

Every task leads with what you're doing and why it matters to someone using your
app. The reviews' own wording sits behind *show the technical detail* — nothing
is lost, and a non-technical person is never blocked by jargon. Technical words
that do appear are defined inline on hover, from the same glossary the generated
docs use.

Plain text is authored per **concern** rather than per finding, which means two
reviews both saying the permission model is undecided produce one task, not two
identical-looking ones.

## The app you're building

The right-hand pane is a working preview, and the left pane is where you change
it: add, remove and rename screens, edit what you keep about each record, and
choose which situations each screen has to handle.

Preview and generated code read **one shared spec**, so they can't structurally
drift — rename a field and both the preview and `lib/types.ts` change. That's
the guarantee that makes a preview worth trusting, and the smoke test enforces it.

### The theme

Four choices — main colour, how strong, corners, type — generate the whole
shadcn token set in oklch, light and dark together so they stay coherent. It
lands on the preview immediately and exports as a standard `globals.css`.

It also **checks whether people can read it**: any text-and-background pair below
4.5:1 gets flagged, in both modes.

This is cheap because of one detail — `src/app/globals.css` uses `@theme inline`,
so Tailwind utilities compile to `var(--primary)` directly. Setting tokens on a
wrapper element cascades into everything inside it, so the preview needs no
iframe and the shadcn components already in the repo pick up your theme for free.

## The documentation

Loom writes a plain-language handbook — readable in the Docs tab and exported to
`docs/` with the code:

what we're building · who it's for · how it works · what the app remembers ·
what you decided and what's still open · the look and feel · how this plan was
put together · a glossary

It's generated from the same spec, findings and feedback as everything else, so
it can't go stale. Written for whoever picks it up: you, someone you report to,
or a developer who wasn't in the room.

## From spec to build

The spec is a list of problems. The build stage turns it into work.

**Tasks.** Every finding becomes a task — `Decide:`, `Design:` or `Build:` —
sized, routed to a milestone, and tagged with the review that raised it. Those
interleave with the construction work the product needs regardless: a type per
entity, a screen per route, the primary flow end to end.

The useful part is what blocks what. The checker already worked out which
concerns gate which others; the build stage makes those operational, so a task
sits visibly blocked until the decision behind it is settled. Mark the open
decisions done and the work behind them unblocks. Gating only ever points
forward through the milestones, and only work that *settles* a concern gates
anything — building the sign-in screen doesn't settle the permission model.

**Scaffold.** A generated starting codebase — a file per screen, types from what
you chose to keep, a storage module every screen reads through, your theme as
`globals.css`, a `components.json` so `npx shadcn add` works, and the docs. It
targets whatever the product is actually about, which is not always the first
entity you named: people list themselves first ("photographers, clients,
shoots") but the screens are about the work, so it picks the first entity that
isn't a person.

Each file carries its reviews into the code:

- the list screen's **empty state is written before the populated one**, because
  the edge case review found it's what every user sees on day one;
- the create screen carries the **failure states** the flow review demanded —
  and when money is in the primary flow, it separates failed-retryable from a
  lost-connection pending state, because those are not the same thing;
- `lib/data.ts` **refuses to guess**: `remove*` throws, because the data model
  review found deletion semantics undecided;
- the detail screen stops at the **permission question** rather than quietly
  collapsing "not found" and "you can't see this".

Everywhere a review found an open question, the generated code carries a
`TODO(loom)` naming the file that raised it. The output typechecks under
`strict` — see below.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Click **Load a filled-in example** on the home page to see a finished graph
without answering eleven questions first.

## Build & test

```bash
npm run build    # production build
npm run lint     # eslint

# end-to-end smoke test (start a server first, then run):
PORT=3100 npm run start &
node scripts/smoke.mjs
```

The smoke test drives the whole product: the interview and its branching, the
live graph preview, YAML emission, genuine parallel execution (it asserts more
than one node is running at once), the checker's cross-referencing, the
prioritized spec, and the build stage — including that renaming a field changes
both the preview and the generated types, that finishing a feature raises a
checkpoint addressed to you by name, and that your feedback becomes a task
quoting what you actually said, and that answering a question records it and
settles the task. 48 checks.

### Does the generated code compile?

Yes, and it's worth checking rather than trusting. Scrape the scaffold out of a
running app, then typecheck it in isolation:

```bash
# with the app running, extract each generated file to .scaffold-check/
# then, with a tsconfig using "strict": true and "@/*" -> "./*":
npx tsc --project .scaffold-check/tsconfig.json
```

This is how the missing type import in the list screen was found.

## Architecture

- `src/app/page.tsx` — home: the paradigm, and your projects.
- `src/app/p/[id]/{interview,graph,run,spec,build}` — the five stages.
- `src/app/api/loom/node/route.ts` — executes a single node.
- `src/lib/loom/interview.ts` — the question script and its branching rules.
- `src/lib/loom/compile.ts` — answers → graph (and the mid-interview preview).
- `src/lib/loom/engine.ts` — the reviews, the checker, and the summary.
- `src/lib/loom/runner.ts` — the DAG scheduler; each node starts the moment its
  dependencies finish, so the fan-out is real rather than staged.
- `src/lib/loom/yaml.ts` — renders the graph in the workflow format.
- `src/lib/loom/screens.ts` — the screen inventory, shared by the screens
  review, the task list, and the scaffold so all three agree on what exists.
- `src/lib/loom/tasks.ts` — spec → backlog, milestones, and the gating rules.
- `src/lib/loom/app.ts` — the editable AppSpec that preview and codegen share.
- `src/lib/loom/plain.ts` — the plain-language layer and the glossary.
- `src/lib/loom/theme.ts` — presets, oklch token generation, contrast checks.
- `src/lib/loom/features.ts` / `checkpoints.ts` — the review loop.
- `src/lib/loom/docs.ts` — the handbook.
- `src/lib/loom/scaffold.ts` — generates the starting codebase.
- `src/components/preview/*` — the live preview.

The engine is pure: same answers in, same reviews out. It runs server-side
through the route handler, with a client-side fallback if that request fails.
State is kept in `localStorage`, so the product works with no external services
or API keys.
