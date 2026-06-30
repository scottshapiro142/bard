export type IntegrationCategory =
  | "Communication"
  | "Data & Analytics"
  | "CRM & Sales"
  | "Finance"
  | "Engineering"
  | "Marketing"
  | "Support"
  | "Productivity";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  connected: boolean;
  /** short two-letter mark used for the logo tile */
  mark: string;
  color: string;
}

export type DeliverableKind =
  | "report"
  | "dashboard"
  | "app"
  | "code"
  | "spreadsheet"
  | "analysis";

export interface WorklogStep {
  label: string;
  detail: string;
  tool?: string;
}

export interface Deliverable {
  kind: DeliverableKind;
  title: string;
  summary: string;
  /** markdown-ish body lines rendered in the deliverable card */
  body: string[];
  metrics?: { label: string; value: string; delta?: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "viktor";
  content: string;
  createdAt: number;
  /** present on viktor messages that represent completed work */
  worklog?: WorklogStep[];
  deliverable?: Deliverable;
  status?: "thinking" | "working" | "done";
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type AutomationCadence =
  | "Every morning"
  | "Hourly"
  | "Every weekday"
  | "Weekly"
  | "On anomaly";

export interface Automation {
  id: string;
  name: string;
  description: string;
  cadence: AutomationCadence;
  enabled: boolean;
  lastRun?: number;
  nextRunLabel: string;
  runs: number;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  kind: DeliverableKind | "automation" | "integration";
  description: string;
  createdAt: number;
  source: string;
}

export interface ViktorState {
  conversations: Conversation[];
  integrations: Integration[];
  automations: Automation[];
  activity: ActivityItem[];
}

/** Response payload returned by the /api/viktor task engine. */
export interface EngineResponse {
  reply: string;
  worklog: WorklogStep[];
  deliverable: Deliverable;
  activity: { title: string; description: string; kind: DeliverableKind };
}
