import type {
  ActivityItem as Activity,
  Automation,
  Integration,
  ViktorState,
} from "./types";

export const SEED_INTEGRATIONS: Integration[] = [
  { id: "slack", name: "Slack", category: "Communication", description: "Where Viktor lives and reports back.", connected: true, mark: "Sl", color: "#611f69" },
  { id: "teams", name: "Microsoft Teams", category: "Communication", description: "Chat with Viktor inside Teams.", connected: false, mark: "Tm", color: "#5059c9" },
  { id: "gmail", name: "Gmail", category: "Communication", description: "Read and send email on your behalf.", connected: true, mark: "Gm", color: "#ea4335" },
  { id: "stripe", name: "Stripe", category: "Finance", description: "Revenue, invoices and subscriptions.", connected: true, mark: "St", color: "#635bff" },
  { id: "quickbooks", name: "QuickBooks", category: "Finance", description: "Accounting ledger and reconciliation.", connected: false, mark: "Qb", color: "#2ca01c" },
  { id: "hubspot", name: "HubSpot", category: "CRM & Sales", description: "Pipeline, deals and contacts.", connected: true, mark: "Hs", color: "#ff7a59" },
  { id: "salesforce", name: "Salesforce", category: "CRM & Sales", description: "Enterprise CRM and opportunities.", connected: false, mark: "Sf", color: "#00a1e0" },
  { id: "postgres", name: "Postgres", category: "Data & Analytics", description: "Your product database.", connected: true, mark: "Pg", color: "#336791" },
  { id: "snowflake", name: "Snowflake", category: "Data & Analytics", description: "Warehouse for heavy analytics.", connected: false, mark: "Sn", color: "#29b5e8" },
  { id: "github", name: "GitHub", category: "Engineering", description: "Read code, open PRs, run tests.", connected: true, mark: "Gh", color: "#24292f" },
  { id: "linear", name: "Linear", category: "Engineering", description: "Issues and engineering planning.", connected: false, mark: "Ln", color: "#5e6ad2" },
  { id: "vercel", name: "Vercel", category: "Engineering", description: "Deploy the apps Viktor builds.", connected: true, mark: "Vc", color: "#000000" },
  { id: "googleads", name: "Google Ads", category: "Marketing", description: "Search and display spend.", connected: true, mark: "Ga", color: "#4285f4" },
  { id: "meta", name: "Meta Ads", category: "Marketing", description: "Facebook and Instagram campaigns.", connected: true, mark: "Me", color: "#0866ff" },
  { id: "zendesk", name: "Zendesk", category: "Support", description: "Support tickets and triage.", connected: false, mark: "Zd", color: "#03363d" },
  { id: "intercom", name: "Intercom", category: "Support", description: "Customer messaging and inbox.", connected: false, mark: "Ic", color: "#1f8ded" },
  { id: "notion", name: "Notion", category: "Productivity", description: "Docs and knowledge base.", connected: true, mark: "No", color: "#000000" },
  { id: "sheets", name: "Google Sheets", category: "Productivity", description: "Read and write spreadsheets.", connected: true, mark: "Gs", color: "#0f9d58" },
  { id: "jira", name: "Jira", category: "Engineering", description: "Track issues across teams.", connected: false, mark: "Ji", color: "#0052cc" },
  { id: "shopify", name: "Shopify", category: "Finance", description: "Orders and storefront revenue.", connected: false, mark: "Sh", color: "#95bf47" },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/**
 * Anchor seed timestamps to process start so demo data always reads as
 * recent ("6h ago"). Once the workspace is persisted to localStorage these
 * values are frozen, so relative labels stay stable for the user.
 */
const T0 = Date.now();

export const SEED_AUTOMATIONS: Automation[] = [
  {
    id: "auto-morning-brief",
    name: "Morning revenue briefing",
    description: "Posts revenue, signups and pipeline to #leadership every morning at 8am.",
    cadence: "Every morning",
    enabled: true,
    lastRun: T0 - 6 * HOUR,
    nextRunLabel: "Tomorrow, 8:00 AM",
    runs: 42,
    createdAt: T0 - 60 * DAY,
  },
  {
    id: "auto-ad-audit",
    name: "Weekly ad audit",
    description: "Audits paid channels and flags CAC anomalies in #growth every Monday.",
    cadence: "Weekly",
    enabled: true,
    lastRun: T0 - 2 * DAY,
    nextRunLabel: "Monday, 9:00 AM",
    runs: 11,
    createdAt: T0 - 80 * DAY,
  },
  {
    id: "auto-anomaly",
    name: "Revenue anomaly alerts",
    description: "Watches MRR and charge failures, alerts the moment something looks off.",
    cadence: "On anomaly",
    enabled: false,
    nextRunLabel: "When triggered",
    runs: 3,
    createdAt: T0 - 30 * DAY,
  },
];

export const SEED_ACTIVITY: Activity[] = [
  { id: "act-1", title: "Posted morning revenue briefing", kind: "automation", description: "MRR $248.6k (+12.4%), 1,284 new signups.", createdAt: T0 - 6 * HOUR, source: "Morning revenue briefing" },
  { id: "act-2", title: "Reconciled Stripe and QuickBooks", kind: "spreadsheet", description: "98.9% auto-matched, 14 flagged for review.", createdAt: T0 - 28 * HOUR, source: "Chat" },
  { id: "act-3", title: "Opened PR #482", kind: "code", description: "Fixed a webhook race condition with tests.", createdAt: T0 - 2 * DAY, source: "Chat" },
  { id: "act-4", title: "Ran weekly ad performance audit", kind: "report", description: "Found the CAC spike driver and proposed a fix.", createdAt: T0 - 2 * DAY, source: "Weekly ad audit" },
];

/** Sample metrics powering the Dashboards view. */
export const DASHBOARD = {
  kpis: [
    { label: "MRR", value: "$248.6k", delta: "+12.4%", positive: true },
    { label: "New signups (30d)", value: "1,284", delta: "+8.1%", positive: true },
    { label: "Blended CAC", value: "$142", delta: "-6.3%", positive: true },
    { label: "Open pipeline", value: "$1.92M", delta: "+18.0%", positive: true },
  ],
  revenue: [
    { month: "Jan", mrr: 168, signups: 720 },
    { month: "Feb", mrr: 182, signups: 810 },
    { month: "Mar", mrr: 196, signups: 905 },
    { month: "Apr", mrr: 211, signups: 1010 },
    { month: "May", mrr: 229, signups: 1145 },
    { month: "Jun", mrr: 249, signups: 1284 },
  ],
  channels: [
    { name: "Search", roas: 3.1, cac: 118 },
    { name: "LinkedIn", roas: 3.4, cac: 132 },
    { name: "Meta", roas: 1.9, cac: 196 },
    { name: "Referral", roas: 5.2, cac: 54 },
  ],
};

export function seedState(): ViktorState {
  return {
    conversations: [],
    integrations: SEED_INTEGRATIONS.map((i) => ({ ...i })),
    automations: SEED_AUTOMATIONS.map((a) => ({ ...a })),
    activity: SEED_ACTIVITY.map((a) => ({ ...a })),
  };
}
