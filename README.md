# Viktor — Your AI employee

> Not a tool. A hire.

Viktor is an AI employee that does real work. Assign a task in plain English and
Viktor plans it, queries your connected tools, runs code, and delivers a real
output — a report, dashboard, app, pull request or reconciliation — then keeps
recurring work running on autopilot.

This is a functional product built with **Next.js (App Router)** and
**shadcn/ui**.

## Features

- **Chat / task engine** — assign Viktor a task and watch him work: a live
  worklog (querying tools, running code) followed by a concrete deliverable with
  metrics. Conversations persist locally. Backed by a server route
  (`/api/viktor`) that classifies intent and produces the work.
- **Dashboards** — live KPI dashboard (MRR, signups, CAC, pipeline) with trend
  and channel charts that Viktor "builds" from connected tools.
- **Integrations** — searchable catalog across categories; connect/disconnect
  tools, with state persisted.
- **Automations** — "approve once, runs on autopilot." Create, toggle, run-now
  and delete scheduled jobs.
- **Activity** — a unified feed of everything Viktor has delivered, filterable by
  type.
- Responsive (desktop sidebar + mobile drawer), dark themed.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build & test

```bash
npm run build    # production build
npm run lint     # eslint

# end-to-end smoke test (starts a server first, then run):
PORT=3100 npm run start &
node scripts/smoke.mjs
```

The smoke test drives every feature with Playwright (overview, chat task →
deliverable, integrations search/connect, dashboards, automations create/toggle,
activity feed, mobile nav).

## Architecture

- `src/app/(app)/*` — workspace routes (overview, chat, dashboards, integrations,
  automations, activity) sharing the `AppShell`.
- `src/app/api/viktor/route.ts` — server task engine endpoint.
- `src/lib/viktor/engine.ts` — deterministic intent → worklog + deliverable
  engine (the "AI employee" brain).
- `src/lib/viktor/store.tsx` — client state + localStorage persistence.
- `src/components/ui/*` — shadcn/ui primitives.

State is kept client-side and persisted to `localStorage`, so the product is
fully functional with no external services or API keys.
