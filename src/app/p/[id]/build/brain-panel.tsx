"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AREAS, type Area } from "@/lib/brain/types";
import { genetics } from "@/lib/brain/genetics";
import type { AppSpec } from "@/lib/loom/app";
import type { Brief, Task } from "@/lib/loom/types";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BrainView {
  projectName: string;
  updatedAt: number;
  decisions: {
    id: string;
    subject: string;
    area: Area;
    statement: string;
    why: string;
    madeBy: string;
    at: number;
  }[];
  agents: {
    id: string;
    name: string;
    role: string;
    scopes: Area[];
    revoked: boolean;
    lastSeenAt?: number;
    token?: string;
  }[];
  standoffs: {
    id: string;
    subject: string;
    state: string;
    existing: { statement: string; why: string; madeBy: string };
    proposed: { statement: string; why: string; madeBy: string };
  }[];
}

function CopyLine({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
      <span
        data-testid="agent-token"
        className="min-w-0 flex-1 truncate font-mono text-[11px]"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            // clipboard blocked — the text is selectable
          }
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

/**
 * The brain, from the owner's side.
 *
 * Several agents will work on this app and they don't all exist at once. This
 * is the shared memory they read so the second one doesn't undo the first — and
 * where the human sees who's allowed in and settles it when two of them
 * disagree.
 */
export function BrainPanel({
  projectId,
  projectName,
  brief,
  app,
  tasks,
  answers,
  token,
  onToken,
}: {
  projectId: string;
  projectName: string;
  brief: Brief;
  app: AppSpec;
  tasks: Task[];
  answers: Record<string, string>;
  token: string;
  onToken: (token: string) => void;
}) {
  const [brain, setBrain] = React.useState<BrainView | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [scopes, setScopes] = React.useState<Area[]>(["ux"]);
  const [issued, setIssued] = React.useState<{ name: string; token: string } | null>(
    null
  );
  const [working, setWorking] = React.useState<string | null>(null);
  const [job, setJob] = React.useState("");
  const [log, setLog] = React.useState<string[]>([]);

  const payload = React.useMemo(
    () => genetics({ brief, app, tasks, answers }),
    [brief, app, tasks, answers]
  );

  const sync = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const put = await fetch(`/api/brain/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ projectName, decisions: payload }),
      });
      const result = await put.json();
      const owner: string = result.ownerToken ?? token;
      if (result.ownerToken) onToken(result.ownerToken);
      if (!put.ok && !result.ownerToken) throw new Error(result.error);

      const get = await fetch(`/api/brain/${projectId}`, {
        headers: { Authorization: `Bearer ${owner}` },
      });
      if (!get.ok) throw new Error((await get.json()).error);
      setBrain(await get.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the brain.");
    } finally {
      setBusy(false);
    }
  }, [projectId, projectName, payload, token, onToken]);

  const started = React.useRef(false);
  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    void sync();
  }, [sync]);

  const call = async (path: string, body: unknown) => {
    await fetch(`/api/brain/${projectId}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    await sync();
  };

  /** Put a real Claude session to work, and watch it think. */
  const putToWork = async (agentId: string) => {
    setWorking(agentId);
    setLog([]);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId, agentId, task: job }),
      });

      if (!res.ok || !res.body) {
        setLog([(await res.json().catch(() => ({}))).error ?? "Couldn't start it."]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          setLog((prev) => [
            ...prev,
            event.type === "tool"
              ? `· ${event.summary}`
              : event.type === "said"
                ? event.text
                : event.type === "done"
                  ? `— finished in ${event.turns} turns, $${event.cost.toFixed(3)}`
                  : event.type === "failed"
                    ? `— ${event.message}`
                    : `— started`,
          ]);
        }
      }
      await sync();
    } catch (e) {
      setLog((prev) => [...prev, e instanceof Error ? e.message : "Something went wrong."]);
    } finally {
      setWorking(null);
      setJob("");
    }
  };

  const open = brain?.standoffs.filter((s) => s.state === "open") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              The brain
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              One record of what this app is, so several agents can work on it
              without contradicting each other. They read it before they build;
              anything they decide gets logged here with the reasoning.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={sync}
            disabled={busy}
            className="gap-1.5"
            data-testid="brain-sync"
          >
            <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            {busy ? "Syncing" : "Sync"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      {open.length > 0 ? (
        <section data-testid="standoffs">
          <h3 className="mb-1 text-sm font-semibold">
            {open.length === 1
              ? "An agent disagrees with something already settled"
              : `${open.length} agents disagree with things already settled`}
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Nothing was overwritten. It&apos;s your call.
          </p>
          <div className="space-y-3">
            {open.map((standoff) => (
              <div
                key={standoff.id}
                data-standoff={standoff.id}
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3"
              >
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-amber-500">
                  <ShieldAlert className="size-3.5" />
                  {standoff.subject}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      Settled now
                    </p>
                    <p className="mt-1 text-sm">{standoff.existing.statement}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {standoff.existing.why}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      What the agent wants
                    </p>
                    <p className="mt-1 text-sm">{standoff.proposed.statement}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {standoff.proposed.why}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    data-testid={`keep-${standoff.id}`}
                    onClick={() => call(`standoffs/${standoff.id}`, { keep: true })}
                  >
                    Keep what we had
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => call(`standoffs/${standoff.id}`, { keep: false })}
                  >
                    Go with the agent
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-1 text-sm font-semibold">Who&apos;s allowed in</h3>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          Every agent gets its own key and can only write to the areas you
          approve. A visual design agent can log colour decisions; it can&apos;t
          quietly change what you store.
        </p>

        {brain?.agents.length ? (
          <ul className="mb-3 space-y-2">
            {brain.agents.map((agent) => (
              <li
                key={agent.id}
                data-agent={agent.id}
                className={cn(
                  "rounded-xl border p-3",
                  agent.revoked && "opacity-50"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{agent.name}</span>
                  {agent.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-[10px]">
                      {scope}
                    </Badge>
                  ))}
                  {agent.revoked ? (
                    <Badge variant="outline" className="text-[10px]">
                      revoked
                    </Badge>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Revoke ${agent.name}`}
                      onClick={() => call(`revoke/${agent.id}`, {})}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                {agent.role ? (
                  <p className="mt-1 text-xs text-muted-foreground">{agent.role}</p>
                ) : null}
                {agent.token ? (
                  <div className="mt-2">
                    <CopyLine value={agent.token} label={`${agent.name} key`} />
                  </div>
                ) : null}

                {!agent.revoked ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={working === agent.id ? job : undefined}
                      defaultValue=""
                      rows={2}
                      data-testid={`job-${agent.id}`}
                      placeholder={`Tell ${agent.name} what to do. It reads the brain first.`}
                      onChange={(e) => setJob(e.target.value)}
                      className="resize-none text-sm"
                      disabled={working !== null}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      data-testid={`run-${agent.id}`}
                      disabled={working !== null || !job.trim()}
                      onClick={() => putToWork(agent.id)}
                    >
                      <Play className="size-3.5" />
                      {working === agent.id ? "Working…" : "Put it to work"}
                    </Button>

                    {working === agent.id || (log.length > 0 && working === null) ? (
                      <div
                        className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/30 p-2.5"
                        data-testid="agent-log"
                      >
                        {log.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Starting a session…
                          </p>
                        ) : (
                          log.map((line, i) => (
                            <p
                              key={i}
                              className={cn(
                                "text-xs leading-relaxed",
                                line.startsWith("·") || line.startsWith("—")
                                  ? "font-mono text-muted-foreground"
                                  : "text-foreground/90"
                              )}
                            >
                              {line}
                            </p>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No agents yet. Approve one and hand it the key below.
          </p>
        )}

        <div className="space-y-2 rounded-xl border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={name}
              placeholder="Name — e.g. Visual design agent"
              data-testid="agent-name"
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
            <Input
              value={role}
              placeholder="What it's here to do"
              onChange={(e) => setRole(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((area) => {
              const on = scopes.includes(area.value);
              return (
                <button
                  key={area.value}
                  type="button"
                  title={area.plain}
                  data-scope={area.value}
                  onClick={() =>
                    setScopes(
                      on
                        ? scopes.filter((s) => s !== area.value)
                        : [...scopes, area.value]
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "border-primary bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {area.label}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            disabled={!name.trim() || scopes.length === 0}
            data-testid="approve-agent"
            onClick={async () => {
              await call("agents", { name, role, scopes });
              setIssued({ name, token: "" });
              setName("");
              setRole("");
            }}
          >
            Approve this agent
          </Button>
          {issued ? (
            <p className="text-xs text-muted-foreground">
              Approved. Its key is on the card above — hand that to the agent.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">
          What&apos;s on the record
          {brain ? (
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {brain.decisions.length}
            </span>
          ) : null}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          Everything settled so far, and who settled it. Agents read this before
          they start.
        </p>
        <div className="space-y-4">
          {AREAS.map((area) => {
            const group =
              brain?.decisions.filter((d) => d.area === area.value) ?? [];
            if (group.length === 0) return null;
            return (
              <div key={area.value}>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {area.label}
                </p>
                <ul className="space-y-1.5">
                  {group.map((decision) => (
                    <li
                      key={decision.id}
                      data-decision={decision.subject}
                      className="rounded-lg border p-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <code className="font-mono text-[11px] text-primary">
                          {decision.subject}
                        </code>
                        <span className="text-[10px] text-muted-foreground">
                          {decision.madeBy === "human"
                            ? "you"
                            : brain?.agents.find((a) => a.id === decision.madeBy)
                                ?.name ?? decision.madeBy}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{decision.statement}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {decision.why}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Wiring an agent up</h3>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          Hand an agent its key and this address. It asks what&apos;s been
          decided before it starts, and logs what it decides as it goes.
        </p>
        <CodeBlock
          language="json"
          filename="what the agent needs"
          code={`Project:  ${projectId}
Read:     GET  /api/brain/${projectId}/decisions?about=ownership
Log:      POST /api/brain/${projectId}/decisions
Header:   Authorization: Bearer <its own key>
Docs:     GET  /api/brain/_docs

# Logging something requires "why". A decision without its
# reasoning gets re-litigated by the next agent along.
{
  "subject": "shoot.ownership",
  "area": "data",
  "statement": "One person owns a shoot.",
  "why": "Simplest to build, and the interview said solo photographers."
}`}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          If an agent logs something that contradicts a settled decision, it
          gets a 409 and the change lands here as a disagreement rather than
          overwriting your work.
        </p>
      </section>
    </div>
  );
}
