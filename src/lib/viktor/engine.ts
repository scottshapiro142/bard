import type { Deliverable, EngineResponse, WorklogStep } from "./types";

/**
 * Viktor's task engine. Given a natural-language task, it classifies the
 * intent, simulates the work an AI employee would do (querying tools, running
 * code, analysing data) and returns a worklog plus a concrete deliverable.
 *
 * This is deterministic so the product is fully functional and testable
 * without any external model dependency.
 */

type Intent =
  | "dashboard"
  | "report"
  | "app"
  | "code"
  | "finance"
  | "marketing"
  | "support"
  | "analysis";

interface Blueprint {
  intent: Intent;
  match: RegExp;
  build: (task: string) => Omit<EngineResponse, "reply"> & { reply: string };
}

function steps(...s: WorklogStep[]): WorklogStep[] {
  return s;
}

const BLUEPRINTS: Blueprint[] = [
  {
    intent: "dashboard",
    match: /dashboard|kpi|metrics|overview|signups?|revenue|pipeline|cac|funnel/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "dashboard",
        title: "Growth & Revenue Dashboard",
        summary:
          "Live dashboard unifying revenue, signups, CAC and pipeline, refreshed from your connected tools.",
        body: [
          "Pulled the last 90 days from Stripe, the product database and HubSpot.",
          "Reconciled signups against activated accounts to remove duplicates.",
          "Wired it to auto-refresh every hour and deployed it behind your workspace auth.",
        ],
        metrics: [
          { label: "MRR", value: "$248.6k", delta: "+12.4%" },
          { label: "New signups (30d)", value: "1,284", delta: "+8.1%" },
          { label: "Blended CAC", value: "$142", delta: "-6.3%" },
          { label: "Pipeline", value: "$1.92M", delta: "+18.0%" },
        ],
      };
      return {
        reply:
          "Done — I built a live Growth & Revenue dashboard. It unifies revenue, signups, CAC and pipeline in one view and refreshes hourly. I deployed it behind your workspace auth so the team can open it from a link.",
        worklog: steps(
          { label: "Scoped the request", detail: "Identified the metrics that matter: revenue, signups, CAC, pipeline.", tool: "Reasoning" },
          { label: "Queried Stripe", detail: "Fetched 90 days of charges, refunds and active subscriptions.", tool: "Stripe" },
          { label: "Queried the product DB", detail: "Counted signups and activations, de-duped by account.", tool: "Postgres" },
          { label: "Pulled pipeline from HubSpot", detail: "Summed open deals weighted by stage probability.", tool: "HubSpot" },
          { label: "Built & deployed the app", detail: "Generated a Next.js dashboard with charts and shipped it behind auth.", tool: "Code" }
        ),
        deliverable,
        activity: {
          title: "Built Growth & Revenue dashboard",
          description: "Live dashboard deployed behind workspace auth.",
          kind: "dashboard",
        },
      };
    },
  },
  {
    intent: "finance",
    match: /invoice|reconcile|quickbooks|stripe|payment|accounting|expense|refund|ledger/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "spreadsheet",
        title: "Stripe ↔ QuickBooks Reconciliation",
        summary:
          "Matched invoices across Stripe and QuickBooks and flagged the mismatches for review.",
        body: [
          "Matched 1,203 of 1,217 invoices automatically by amount, date and customer.",
          "Flagged 14 mismatches: 9 currency-rounding, 3 missing in QuickBooks, 2 duplicate charges.",
          "Exported a reconciliation spreadsheet with a 'Needs review' tab.",
        ],
        metrics: [
          { label: "Invoices matched", value: "1,203 / 1,217" },
          { label: "Auto-match rate", value: "98.9%" },
          { label: "Needs review", value: "14" },
          { label: "Net variance", value: "$1,842" },
        ],
      };
      return {
        reply:
          "I reconciled Stripe against QuickBooks. 98.9% matched automatically — I flagged 14 invoices that need a human look and put them on a 'Needs review' tab in the spreadsheet.",
        worklog: steps(
          { label: "Loaded Stripe invoices", detail: "Pulled all invoices for the period with line items.", tool: "Stripe" },
          { label: "Loaded QuickBooks ledger", detail: "Fetched matching transactions and customers.", tool: "QuickBooks" },
          { label: "Ran the matcher", detail: "Matched on amount, date window and fuzzy customer name.", tool: "Code" },
          { label: "Exported results", detail: "Wrote a spreadsheet with matched and needs-review tabs.", tool: "Sheets" }
        ),
        deliverable,
        activity: {
          title: "Reconciled Stripe and QuickBooks",
          description: "98.9% auto-matched, 14 flagged for review.",
          kind: "spreadsheet",
        },
      };
    },
  },
  {
    intent: "marketing",
    match: /\bads?\b|campaign|marketing|spend|roas|ctr|audit|acquisition|channel/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "report",
        title: "Weekly Ad Performance Audit",
        summary:
          "Audited paid channels, traced the CAC spike to a single campaign and proposed a fix.",
        body: [
          "CAC rose 23% week-over-week — 80% of the increase came from one Meta campaign with falling CTR.",
          "Google Search held steady; LinkedIn improved ROAS by 11%.",
          "Recommendation: pause the underperforming Meta ad set and shift 30% of its budget to Search.",
        ],
        metrics: [
          { label: "Blended CAC", value: "$142", delta: "+23%" },
          { label: "Worst channel", value: "Meta — Retarget" },
          { label: "Best ROAS", value: "LinkedIn 3.4x" },
          { label: "Proposed saving", value: "$6.2k / wk" },
        ],
      };
      return {
        reply:
          "I audited this week's ad spend. The CAC spike traces back to one Meta retargeting ad set with collapsing CTR. I'd pause it and move 30% of its budget to Search — that recovers about $6.2k/week. Want me to set this up as a weekly automation?",
        worklog: steps(
          { label: "Pulled channel spend", detail: "Collected spend, clicks and conversions per channel.", tool: "Google Ads" },
          { label: "Pulled Meta performance", detail: "Broke down CAC and CTR by campaign and ad set.", tool: "Meta Ads" },
          { label: "Found the driver", detail: "Attributed 80% of the CAC rise to one ad set.", tool: "Analysis" },
          { label: "Wrote recommendations", detail: "Modeled the budget shift and expected saving.", tool: "Reasoning" }
        ),
        deliverable,
        activity: {
          title: "Ran weekly ad performance audit",
          description: "Found the CAC spike driver and proposed a fix.",
          kind: "report",
        },
      };
    },
  },
  {
    intent: "support",
    match: /support|ticket|triage|zendesk|intercom|customer issue|complaint|nps/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "analysis",
        title: "Support Ticket Triage",
        summary:
          "Triaged the open queue, clustered the themes and drafted replies for the top issues.",
        body: [
          "Triaged 318 open tickets into 6 themes; 41% are about a single billing edge case.",
          "Auto-tagged and prioritized by sentiment and account value.",
          "Drafted reusable replies for the top 3 themes for your team to approve.",
        ],
        metrics: [
          { label: "Tickets triaged", value: "318" },
          { label: "Top theme", value: "Billing — proration" },
          { label: "Avg sentiment", value: "Neutral ↘" },
          { label: "Draft replies", value: "3 ready" },
        ],
      };
      return {
        reply:
          "I triaged the support queue. 41% of open tickets are the same billing proration edge case — I clustered everything into 6 themes, prioritized by sentiment and account value, and drafted replies for the top 3 for your team to approve.",
        worklog: steps(
          { label: "Loaded open tickets", detail: "Pulled the full open queue with metadata.", tool: "Zendesk" },
          { label: "Clustered themes", detail: "Grouped tickets by issue using embeddings.", tool: "Code" },
          { label: "Scored priority", detail: "Ranked by sentiment and account value.", tool: "Analysis" },
          { label: "Drafted replies", detail: "Wrote approve-ready responses for the top themes.", tool: "Reasoning" }
        ),
        deliverable,
        activity: {
          title: "Triaged support queue",
          description: "318 tickets clustered into 6 themes with draft replies.",
          kind: "analysis",
        },
      };
    },
  },
  {
    intent: "code",
    match: /code|bug|pull request|\bpr\b|refactor|repo|test|deploy|api|endpoint|fix/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "code",
        title: "Pull Request: fix race in webhook handler",
        summary:
          "Read the repo, reproduced the bug, fixed it on a branch and opened a PR with tests.",
        body: [
          "Reproduced the duplicate-charge race in the Stripe webhook handler.",
          "Added an idempotency key and a covering test; all 214 tests pass.",
          "Opened PR #482 with a description and linked the failing issue.",
        ],
        metrics: [
          { label: "Branch", value: "fix/webhook-idempotency" },
          { label: "Files changed", value: "4" },
          { label: "Tests", value: "214 passing" },
          { label: "PR", value: "#482 open" },
        ],
      };
      return {
        reply:
          "I read the repo, reproduced the bug and fixed it. The webhook handler wasn't idempotent, so retries could double-charge. I added an idempotency key plus a covering test, ran the suite (214 passing) and opened PR #482 for review.",
        worklog: steps(
          { label: "Cloned & read the repo", detail: "Mapped the webhook flow and found the unguarded path.", tool: "Code" },
          { label: "Reproduced the bug", detail: "Wrote a failing test that triggers the double charge.", tool: "Tests" },
          { label: "Implemented the fix", detail: "Added an idempotency key keyed on the event id.", tool: "Code" },
          { label: "Opened a PR", detail: "Pushed the branch and opened PR #482 with context.", tool: "GitHub" }
        ),
        deliverable,
        activity: {
          title: "Opened PR #482",
          description: "Fixed a webhook race condition with tests.",
          kind: "code",
        },
      };
    },
  },
  {
    intent: "app",
    match: /\bapp\b|tool|calculator|internal tool|form|portal|build me|web app/i,
    build: () => {
      const deliverable: Deliverable = {
        kind: "app",
        title: "Internal Tool: Pricing Calculator",
        summary:
          "Built and deployed an internal pricing calculator with a database and auth.",
        body: [
          "Generated a web app with inputs for seats, plan and discount.",
          "Added a Postgres table to save quotes and a shareable link per quote.",
          "Deployed behind your workspace auth — live at the link below.",
        ],
        metrics: [
          { label: "Type", value: "Web app" },
          { label: "Backend", value: "Postgres + auth" },
          { label: "Status", value: "Deployed" },
          { label: "Build time", value: "4m 12s" },
        ],
      };
      return {
        reply:
          "Built it. I generated a pricing calculator web app with a database to save quotes and shareable links, then deployed it behind your workspace auth. It's live — open it from the deliverable below.",
        worklog: steps(
          { label: "Scoped the tool", detail: "Defined inputs, outputs and who needs access.", tool: "Reasoning" },
          { label: "Generated the app", detail: "Built the UI, the calc logic and a quotes table.", tool: "Code" },
          { label: "Added persistence", detail: "Provisioned Postgres and wired save/load.", tool: "Postgres" },
          { label: "Deployed", detail: "Shipped behind workspace auth with a public link.", tool: "Deploy" }
        ),
        deliverable,
        activity: {
          title: "Built pricing calculator app",
          description: "Deployed an internal tool with database and auth.",
          kind: "app",
        },
      };
    },
  },
];

const REPORT_BLUEPRINT: Blueprint = {
  intent: "report",
  match: /.*/,
  build: (task) => {
    const clean = task.trim().replace(/\s+/g, " ");
    const short = clean.length > 70 ? clean.slice(0, 67) + "…" : clean;
    const deliverable: Deliverable = {
      kind: "report",
      title: short ? `Report: ${short}` : "Task report",
      summary: "Gathered the relevant data, analysed it and wrote up the findings.",
      body: [
        "Queried your connected tools for the data this task needs.",
        "Analysed it and pulled out the signal worth acting on.",
        "Wrote up findings and a recommended next step below.",
      ],
      metrics: [
        { label: "Sources used", value: "3" },
        { label: "Confidence", value: "High" },
        { label: "Output", value: "Report" },
        { label: "Next step", value: "1 proposed" },
      ],
    };
    return {
      reply:
        "On it — I pulled the data this needs from your connected tools, analysed it and wrote up what I found. The report with a recommended next step is below. Tell me if you'd like this on a recurring schedule.",
      worklog: steps(
        { label: "Understood the task", detail: clean || "Parsed the request and planned the work.", tool: "Reasoning" },
        { label: "Gathered data", detail: "Queried the relevant connected tools.", tool: "Integrations" },
        { label: "Analysed", detail: "Found the signal and sanity-checked it.", tool: "Code" },
        { label: "Wrote it up", detail: "Produced a report with a recommended next step.", tool: "Reasoning" }
      ),
      deliverable,
      activity: {
        title: "Completed a task",
        description: short || "Delivered a report.",
        kind: "report",
      },
    };
  },
};

export function runViktor(task: string): EngineResponse {
  const blueprint =
    BLUEPRINTS.find((b) => b.match.test(task)) ?? REPORT_BLUEPRINT;
  return blueprint.build(task);
}
