"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Send, MessageSquare, Trash2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViktor } from "@/lib/viktor/store";
import { MessageItem } from "@/components/chat/message-item";
import { ViktorMark } from "@/components/viktor-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STARTERS = [
  "Build a dashboard of revenue, signups, CAC and pipeline.",
  "Audit our ad spend and tell me why CAC went up.",
  "Reconcile Stripe and QuickBooks and flag mismatches.",
  "Read the repo, fix the webhook bug and open a PR.",
];

export function ChatView() {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const {
    conversations,
    getConversation,
    sendTask,
    deleteConversation,
    ready,
  } = useViktor();

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const active = activeId ? getConversation(activeId) : undefined;
  const messageCount = active?.messages.length ?? 0;
  const lastStatus = active?.messages[messageCount - 1]?.status;

  // Keep the thread scrolled to the bottom as messages arrive.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, lastStatus]);

  const select = (id: string) => router.push(`/chat?c=${id}`);

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setInput("");
    const id = await sendTask(activeId, value);
    if (id !== activeId) router.push(`/chat?c=${id}`);
    setBusy(false);
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
    if (id === activeId) router.push("/chat");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      {/* conversation list */}
      <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => router.push("/chat")}
          >
            <Plus className="size-4" />
            New task
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No tasks yet. Assign Viktor something.
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    c.id === activeId
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/60"
                  )}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }
                    }}
                    className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {!active || active.messages.length === 0 ? (
              <EmptyState onPick={submit} busy={busy} ready={ready} />
            ) : (
              <div className="space-y-6">
                {active.messages.map((m) => (
                  <MessageItem key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="border-t bg-background/80 p-4 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Assign Viktor a task…"
                className="max-h-40 min-h-12 resize-none pr-12"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
              />
              <Button
                size="icon"
                className="absolute bottom-2.5 right-2.5"
                disabled={!input.trim() || busy}
                onClick={() => submit(input)}
                aria-label="Send task"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              Viktor queries your connected tools and runs code to deliver real
              outputs. Press Enter to send.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  busy,
  ready,
}: {
  onPick: (t: string) => void;
  busy: boolean;
  ready: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <ViktorMark className="size-12" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Assign Viktor a task</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Describe what you need in plain English. Viktor will plan it, use your
          connected tools, and deliver a report, dashboard, app or pull request.
        </p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            disabled={busy || !ready}
            onClick={() => onPick(s)}
            className="flex items-start gap-2 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
