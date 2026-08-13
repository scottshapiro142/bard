# Loom — Interview in. Graph out.

> A design review that isn't one opinion, hedged.

Loom is a tool for product designers. It interviews you about the app you're
designing, compiles your answers into a **workflow graph**, runs every review in
that graph independently and in parallel, then hands back a prioritized,
build-ready spec.

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

## The four stages

| Stage | What happens |
| --- | --- |
| **Interview** | Up to eleven questions, one at a time. The set adapts — a marketplace gets asked about cold start, an internal tool about permissions. The graph assembles live in the sidebar as you answer. |
| **Graph** | Answers compile into nodes. Which reviews exist depends on what you said: mobile targets add a platform review, "going to production" adds a scale-risk review. Rendered as a diagram and as YAML. |
| **Run** | Every leaf review fires at the same moment. The checker is the only node that waits, because it's the only one that needs everything. |
| **Spec** | One prioritized document — critical, then medium, then low — plus every intermediate file the graph produced. |

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
than one node is running at once), the checker's cross-referencing, and the
prioritized spec.

## Architecture

- `src/app/page.tsx` — home: the paradigm, and your projects.
- `src/app/p/[id]/{interview,graph,run,spec}` — the four stages.
- `src/app/api/loom/node/route.ts` — executes a single node.
- `src/lib/loom/interview.ts` — the question script and its branching rules.
- `src/lib/loom/compile.ts` — answers → graph (and the mid-interview preview).
- `src/lib/loom/engine.ts` — the reviews, the checker, and the summary.
- `src/lib/loom/runner.ts` — the DAG scheduler; each node starts the moment its
  dependencies finish, so the fan-out is real rather than staged.
- `src/lib/loom/yaml.ts` — renders the graph in the workflow format.

The engine is pure: same answers in, same reviews out. It runs server-side
through the route handler, with a client-side fallback if that request fails.
State is kept in `localStorage`, so the product works with no external services
or API keys.
