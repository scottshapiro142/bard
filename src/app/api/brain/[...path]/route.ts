import { NextResponse } from "next/server";

import {
  approveAgent,
  ensureBrain,
  findAgent,
  getBrain,
  logDecision,
  resolveStandoff,
  revokeAgent,
  search,
  syncHumanDecisions,
} from "@/lib/brain/store";
import type { Agent, Area, Brain } from "@/lib/brain/types";
import { AREAS, activeDecisions, openStandoffs } from "@/lib/brain/types";

/**
 * The brain's API — what agents actually talk to.
 *
 * One catch-all rather than five files, so the authorisation rules sit in one
 * place and are easy to check. Nothing here is cached: an agent asking what was
 * decided must never get a stale answer.
 */

type Caller =
  | { kind: "owner"; brain: Brain }
  | { kind: "agent"; brain: Brain; agent: Agent };

function bearer(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function authorize(brain: Brain, request: Request): Caller | null {
  const token = bearer(request);
  if (!token) return null;
  if (token === brain.ownerToken) return { kind: "owner", brain };
  const agent = findAgent(brain, token);
  return agent ? { kind: "agent", brain, agent } : null;
}

function deny(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

/** Agent tokens are secrets; only the owner ever sees them. */
function publicBrain(brain: Brain, caller: Caller) {
  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    updatedAt: brain.updatedAt,
    decisions: activeDecisions(brain),
    agents: brain.agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      scopes: a.scopes,
      revoked: a.revoked ?? false,
      lastSeenAt: a.lastSeenAt,
      ...(caller.kind === "owner" ? { token: a.token } : {}),
    })),
    standoffs: brain.standoffs,
    you:
      caller.kind === "owner"
        ? { kind: "owner" }
        : { kind: "agent", id: caller.agent.id, scopes: caller.agent.scopes },
  };
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [projectId, resource] = path;

  // The API describes itself, so whoever is wiring an agent up can read it.
  if (projectId === "_docs") {
    return NextResponse.json({
      about:
        "The brain holds one record of an app's genetics so several agents can work on it without contradicting each other.",
      auth: "Authorization: Bearer <token>. Ask the project's owner for one.",
      areas: AREAS,
      endpoints: [
        { method: "GET", path: "/api/brain/{projectId}", who: "any token", does: "Everything currently decided." },
        { method: "GET", path: "/api/brain/{projectId}/decisions?about=ownership", who: "any token", does: "What was decided about something, and why." },
        { method: "POST", path: "/api/brain/{projectId}/decisions", who: "agent, in scope", does: "Log a decision. Contradicting a settled one raises a standoff instead of overwriting it." },
        { method: "GET", path: "/api/brain/{projectId}/standoffs", who: "any token", does: "Disagreements waiting on the human." },
      ],
      logging: {
        subject:
          "A stable key for the thing being decided, like shoot.ownership. Two decisions sharing a subject are about the same question — that's how contradictions are found.",
        why: "Required. The reasoning is what stops the next agent re-litigating it.",
      },
    });
  }

  const brain = getBrain(projectId);
  if (!brain) return deny("No brain for that project.", 404);

  const caller = authorize(brain, request);
  if (!caller) return deny("Bad or missing token.");

  if (!resource) return NextResponse.json(publicBrain(brain, caller));

  if (resource === "decisions") {
    const about = new URL(request.url).searchParams.get("about") ?? "";
    const matches = about ? search(brain, about) : activeDecisions(brain);
    return NextResponse.json({
      about: about || null,
      count: matches.length,
      decisions: matches,
      ...(about && matches.length === 0
        ? {
            note: "Nothing has been decided about that yet. Treat it as open, and say so rather than assuming.",
          }
        : {}),
    });
  }

  if (resource === "standoffs") {
    return NextResponse.json({ standoffs: openStandoffs(brain) });
  }

  if (resource === "agents") {
    if (caller.kind !== "owner") return deny("Owner only.", 403);
    return NextResponse.json({ agents: publicBrain(brain, caller).agents });
  }

  return deny("Unknown resource.", 404);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [projectId] = path;
  const input = await body(request);

  const existing = getBrain(projectId);

  // First sync creates the brain and hands the app its owner token.
  if (!existing) {
    const brain = ensureBrain(
      projectId,
      typeof input.projectName === "string" ? input.projectName : "Untitled"
    );
    syncHumanDecisions(brain, (input.decisions ?? []) as never[]);
    return NextResponse.json({
      created: true,
      ownerToken: brain.ownerToken,
      decisions: activeDecisions(brain).length,
    });
  }

  if (bearer(request) !== existing.ownerToken) return deny("Owner only.", 403);

  if (typeof input.projectName === "string") {
    existing.projectName = input.projectName;
  }
  syncHumanDecisions(existing, (input.decisions ?? []) as never[]);
  return NextResponse.json({
    created: false,
    decisions: activeDecisions(existing).length,
    standoffs: openStandoffs(existing).length,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [projectId, resource, id] = path;

  const brain = getBrain(projectId);
  if (!brain) return deny("No brain for that project.", 404);

  const caller = authorize(brain, request);
  if (!caller) return deny("Bad or missing token.");

  const input = await body(request);

  if (resource === "decisions") {
    if (caller.kind !== "agent") {
      return deny(
        "Agents log decisions here. The app syncs the human's decisions with PUT.",
        403
      );
    }

    const subject = String(input.subject ?? "").trim();
    const statement = String(input.statement ?? "").trim();
    const why = String(input.why ?? "").trim();
    const area = String(input.area ?? "") as Area;

    if (!subject || !statement) {
      return deny("subject and statement are required.", 400);
    }
    if (!why) {
      return deny(
        "why is required. A decision without its reasoning gets re-litigated by the next agent.",
        400
      );
    }
    if (!AREAS.some((a) => a.value === area)) {
      return deny(
        `area must be one of: ${AREAS.map((a) => a.value).join(", ")}.`,
        400
      );
    }
    if (!caller.agent.scopes.includes(area)) {
      return deny(
        `${caller.agent.name} isn't approved to make ${area} decisions. Approved for: ${caller.agent.scopes.join(", ")}.`,
        403
      );
    }

    const result = logDecision(brain, caller.agent, {
      subject,
      area,
      statement,
      why,
    });

    if (result.outcome === "standoff") {
      return NextResponse.json(
        {
          outcome: "standoff",
          message:
            "This contradicts something already settled, so it hasn't been recorded. It's gone to the human to decide.",
          existing: result.standoff?.existing,
          standoffId: result.standoff?.id,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  }

  if (resource === "agents") {
    if (caller.kind !== "owner") return deny("Owner only.", 403);
    const scopes = Array.isArray(input.scopes) ? (input.scopes as Area[]) : [];
    const agent = approveAgent(brain, {
      name: String(input.name ?? "Unnamed agent"),
      role: String(input.role ?? ""),
      scopes: scopes.filter((s) => AREAS.some((a) => a.value === s)),
    });
    return NextResponse.json({ agent });
  }

  if (resource === "revoke" && id) {
    if (caller.kind !== "owner") return deny("Owner only.", 403);
    revokeAgent(brain, id);
    return NextResponse.json({ revoked: id });
  }

  if (resource === "standoffs" && id) {
    if (caller.kind !== "owner") return deny("Owner only.", 403);
    resolveStandoff(brain, id, input.keep !== false);
    return NextResponse.json({ resolved: id });
  }

  return deny("Unknown resource.", 404);
}
