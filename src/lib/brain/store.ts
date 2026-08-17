import type { Agent, Area, Brain, Decision, Standoff } from "./types";

/**
 * Server-side storage for the brain.
 *
 * In-memory, behind one module, so swapping it for a real database is a
 * one-file change — the same seam the generated scaffold uses. Hung off
 * globalThis so a dev-server reload doesn't wipe it mid-session.
 */
const globalStore = globalThis as unknown as {
  __loomBrains?: Map<string, Brain>;
};

function brains(): Map<string, Brain> {
  if (!globalStore.__loomBrains) globalStore.__loomBrains = new Map();
  return globalStore.__loomBrains;
}

let counter = 0;
export function uid(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Long enough that guessing isn't a realistic attack on a local tool. */
export function mintToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `loom_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function getBrain(projectId: string): Brain | undefined {
  return brains().get(projectId);
}

export function ensureBrain(projectId: string, projectName: string): Brain {
  const existing = brains().get(projectId);
  if (existing) return existing;
  const brain: Brain = {
    projectId,
    projectName,
    ownerToken: mintToken(),
    decisions: [],
    agents: [],
    standoffs: [],
    updatedAt: Date.now(),
  };
  brains().set(projectId, brain);
  return brain;
}

export function saveBrain(brain: Brain) {
  brain.updatedAt = Date.now();
  brains().set(brain.projectId, brain);
  return brain;
}

/**
 * Sync the genetics the app itself knows about.
 *
 * The human's decisions are authoritative: a synced decision replaces whatever
 * an agent had recorded for the same subject. Agents record around the human,
 * never over them.
 */
export function syncHumanDecisions(
  brain: Brain,
  incoming: Omit<Decision, "id" | "status">[]
): Brain {
  for (const next of incoming) {
    const current = brain.decisions.find(
      (d) => d.subject === next.subject && d.status === "active"
    );

    if (current && current.statement === next.statement) {
      continue; // nothing changed
    }

    if (current) {
      current.status = "superseded";
    }

    brain.decisions.push({
      ...next,
      id: uid("dec"),
      status: "active",
      supersedes: current?.id,
    });

    // A human answer settles anything an agent was arguing about.
    for (const standoff of brain.standoffs) {
      if (standoff.subject === next.subject && standoff.state === "open") {
        standoff.state = "kept";
        standoff.resolvedAt = Date.now();
      }
    }
  }
  return saveBrain(brain);
}

export function findAgent(brain: Brain, token: string): Agent | undefined {
  return brain.agents.find((a) => a.token === token && !a.revoked);
}

export function approveAgent(
  brain: Brain,
  input: { name: string; role: string; scopes: Area[] }
): Agent {
  const agent: Agent = {
    id: uid("agent"),
    name: input.name,
    role: input.role,
    scopes: input.scopes,
    token: mintToken(),
    approvedAt: Date.now(),
  };
  brain.agents.push(agent);
  saveBrain(brain);
  return agent;
}

export function revokeAgent(brain: Brain, agentId: string) {
  const agent = brain.agents.find((a) => a.id === agentId);
  if (agent) agent.revoked = true;
  return saveBrain(brain);
}

export interface LogResult {
  outcome: "recorded" | "unchanged" | "standoff";
  decision?: Decision;
  standoff?: Standoff;
}

/**
 * An agent logging what it decided.
 *
 * Three outcomes, and the third is the point: if this contradicts something
 * already settled, it does not go through and it does not get dropped. It
 * becomes a standoff for the human, because two agents quietly overwriting
 * each other is exactly what the brain exists to prevent.
 */
export function logDecision(
  brain: Brain,
  agent: Agent,
  input: { subject: string; area: Area; statement: string; why: string }
): LogResult {
  const current = brain.decisions.find(
    (d) => d.subject === input.subject && d.status === "active"
  );

  if (current && current.statement.trim() === input.statement.trim()) {
    agent.lastSeenAt = Date.now();
    saveBrain(brain);
    return { outcome: "unchanged", decision: current };
  }

  if (current) {
    const standoff: Standoff = {
      id: uid("standoff"),
      subject: input.subject,
      existing: current,
      proposed: {
        statement: input.statement,
        why: input.why,
        madeBy: agent.id,
        at: Date.now(),
      },
      state: "open",
    };
    brain.standoffs.push(standoff);
    agent.lastSeenAt = Date.now();
    saveBrain(brain);
    return { outcome: "standoff", standoff };
  }

  const decision: Decision = {
    id: uid("dec"),
    subject: input.subject,
    area: input.area,
    statement: input.statement,
    why: input.why,
    madeBy: agent.id,
    at: Date.now(),
    status: "active",
  };
  brain.decisions.push(decision);
  agent.lastSeenAt = Date.now();
  saveBrain(brain);
  return { outcome: "recorded", decision };
}

export function resolveStandoff(
  brain: Brain,
  standoffId: string,
  keep: boolean
): Brain {
  const standoff = brain.standoffs.find((s) => s.id === standoffId);
  if (!standoff || standoff.state !== "open") return brain;

  standoff.state = keep ? "kept" : "accepted";
  standoff.resolvedAt = Date.now();

  if (!keep) {
    const current = brain.decisions.find(
      (d) => d.subject === standoff.subject && d.status === "active"
    );
    if (current) current.status = "superseded";
    brain.decisions.push({
      id: uid("dec"),
      subject: standoff.subject,
      area: standoff.existing.area,
      statement: standoff.proposed.statement,
      why: standoff.proposed.why,
      madeBy: standoff.proposed.madeBy,
      at: Date.now(),
      supersedes: current?.id,
      status: "active",
    });
  }

  return saveBrain(brain);
}

/** Plain keyword search — explainable, and good enough to answer "what was decided about X". */
export function search(brain: Brain, query: string): Decision[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const active = brain.decisions.filter((d) => d.status === "active");
  if (terms.length === 0) return active;

  return active
    .map((decision) => {
      const haystack =
        `${decision.subject} ${decision.area} ${decision.statement} ${decision.why}`.toLowerCase();
      const score = terms.filter((t) => haystack.includes(t)).length;
      return { decision, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.decision);
}
