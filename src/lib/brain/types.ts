/**
 * The brain: one record of an app's genetics that many agents can read.
 *
 * Several agents will work on a Loom project — one on UX, one on visual design,
 * one writing code — and they come and go. Without a shared memory each one
 * re-decides things that were already settled, and quietly undoes the last
 * one's work. This is that memory, and it lives on the server so something
 * other than the app can reach it.
 */

export type Area = "product" | "ux" | "visual" | "data" | "technical";

export const AREAS: { value: Area; label: string; plain: string }[] = [
  {
    value: "product",
    label: "Product",
    plain: "What it is, who it's for, and what it's deliberately not.",
  },
  {
    value: "ux",
    label: "UX",
    plain: "How it behaves — flows, screens, states, and what happens when things go wrong.",
  },
  {
    value: "visual",
    label: "Visual design",
    plain: "Colour, type, spacing, corners. The design system.",
  },
  {
    value: "data",
    label: "Data",
    plain: "What gets stored, what it's called, and what happens when it's deleted.",
  },
  {
    value: "technical",
    label: "Technical",
    plain: "Platforms, architecture, and how it's put together.",
  },
];

export interface Decision {
  id: string;
  /**
   * A stable key for the thing being decided — "shoot.ownership",
   * "theme.primary". Two decisions sharing a subject are about the same
   * question, which is how a contradiction is detected without guessing.
   */
  subject: string;
  area: Area;
  /** What was decided. */
  statement: string;
  /** Why — the part that stops the next agent re-litigating it. */
  why: string;
  /** Agent id, or "human". */
  madeBy: string;
  at: number;
  /** Set when this decision replaced an earlier one. */
  supersedes?: string;
  status: "active" | "superseded";
}

export interface Agent {
  id: string;
  name: string;
  /** What this agent is here to do, in the operator's words. */
  role: string;
  /** Areas it may write to. Reading is never restricted. */
  scopes: Area[];
  token: string;
  approvedAt: number;
  lastSeenAt?: number;
  /** Revoked agents keep their history but can no longer act. */
  revoked?: boolean;
}

/** An agent wants to overturn something already decided. */
export interface Standoff {
  id: string;
  subject: string;
  existing: Decision;
  proposed: {
    statement: string;
    why: string;
    madeBy: string;
    at: number;
  };
  state: "open" | "kept" | "accepted";
  resolvedAt?: number;
}

export interface Brain {
  projectId: string;
  projectName: string;
  /** Held by the Loom app itself. Mints agent tokens; nothing else may. */
  ownerToken: string;
  decisions: Decision[];
  agents: Agent[];
  standoffs: Standoff[];
  updatedAt: number;
}

export function activeDecisions(brain: Brain): Decision[] {
  return brain.decisions.filter((d) => d.status === "active");
}

export function openStandoffs(brain: Brain): Standoff[] {
  return brain.standoffs.filter((s) => s.state === "open");
}
