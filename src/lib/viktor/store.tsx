"use client";

import * as React from "react";

import { runViktor } from "./engine";
import { seedState } from "./seed";
import type {
  Automation,
  AutomationCadence,
  ChatMessage,
  Conversation,
  ViktorState,
} from "./types";

const STORAGE_KEY = "viktor-state-v1";

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

interface ViktorContextValue extends ViktorState {
  ready: boolean;
  connectedCount: number;
  // chat
  sendTask: (conversationId: string | null, task: string) => Promise<string>;
  newConversation: () => string;
  deleteConversation: (id: string) => void;
  getConversation: (id: string) => Conversation | undefined;
  // integrations
  toggleIntegration: (id: string) => void;
  // automations
  toggleAutomation: (id: string) => void;
  addAutomation: (input: {
    name: string;
    description: string;
    cadence: AutomationCadence;
  }) => void;
  removeAutomation: (id: string) => void;
  runAutomationNow: (id: string) => void;
  resetWorkspace: () => void;
}

const ViktorContext = React.createContext<ViktorContextValue | null>(null);

export function ViktorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ViktorState>(() => seedState());
  const [ready, setReady] = React.useState(false);

  // Hydrate from localStorage on mount. This deliberately syncs React state
  // from an external store (localStorage) once on mount, which is exactly what
  // effects are for; the set-state-in-effect rule is a false positive here.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ViktorState>;
        const base = seedState();
        setState({
          conversations: parsed.conversations ?? base.conversations,
          integrations: parsed.integrations ?? base.integrations,
          automations: parsed.automations ?? base.automations,
          activity: parsed.activity ?? base.activity,
        });
      }
    } catch {
      // ignore corrupt storage, keep seed
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // persist
  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage might be full / unavailable; non-fatal
    }
  }, [state, ready]);

  const newConversation = React.useCallback(() => {
    const id = uid("conv");
    const conv: Conversation = {
      id,
      title: "New task",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setState((s) => ({ ...s, conversations: [conv, ...s.conversations] }));
    return id;
  }, []);

  const deleteConversation = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.filter((c) => c.id !== id),
    }));
  }, []);

  const sendTask = React.useCallback(
    async (conversationId: string | null, task: string) => {
      const trimmed = task.trim();
      if (!trimmed) return conversationId ?? "";

      // ensure a conversation exists
      let convId = conversationId;
      if (!convId) {
        convId = uid("conv");
        const conv: Conversation = {
          id: convId,
          title: trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        setState((s) => ({ ...s, conversations: [conv, ...s.conversations] }));
      }

      const userMsg: ChatMessage = {
        id: uid("msg"),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const thinkingId = uid("msg");
      const thinkingMsg: ChatMessage = {
        id: thinkingId,
        role: "viktor",
        content: "",
        createdAt: Date.now(),
        status: "working",
        worklog: [],
      };

      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                title:
                  c.messages.length === 0
                    ? trimmed.length > 40
                      ? trimmed.slice(0, 40) + "…"
                      : trimmed
                    : c.title,
                updatedAt: Date.now(),
                messages: [...c.messages, userMsg, thinkingMsg],
              }
            : c
        ),
      }));

      // call the task engine (server route). Fall back to local engine.
      let result;
      try {
        const res = await fetch("/api/viktor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: trimmed }),
        });
        if (!res.ok) throw new Error("bad status");
        result = await res.json();
      } catch {
        result = runViktor(trimmed);
      }

      const doneMsg: ChatMessage = {
        id: thinkingId,
        role: "viktor",
        content: result.reply,
        createdAt: Date.now(),
        status: "done",
        worklog: result.worklog,
        deliverable: result.deliverable,
      };

      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === thinkingId ? doneMsg : m
                ),
              }
            : c
        ),
        activity: [
          {
            id: uid("act"),
            title: result.activity.title,
            kind: result.activity.kind,
            description: result.activity.description,
            createdAt: Date.now(),
            source: "Chat",
          },
          ...s.activity,
        ],
      }));

      return convId;
    },
    []
  );

  const getConversation = React.useCallback(
    (id: string) => state.conversations.find((c) => c.id === id),
    [state.conversations]
  );

  const toggleIntegration = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      integrations: s.integrations.map((i) =>
        i.id === id ? { ...i, connected: !i.connected } : i
      ),
    }));
  }, []);

  const toggleAutomation = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      automations: s.automations.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    }));
  }, []);

  const addAutomation = React.useCallback(
    (input: {
      name: string;
      description: string;
      cadence: AutomationCadence;
    }) => {
      const automation: Automation = {
        id: uid("auto"),
        name: input.name,
        description: input.description,
        cadence: input.cadence,
        enabled: true,
        nextRunLabel:
          input.cadence === "On anomaly" ? "When triggered" : "Scheduled",
        runs: 0,
        createdAt: Date.now(),
      };
      setState((s) => ({
        ...s,
        automations: [automation, ...s.automations],
        activity: [
          {
            id: uid("act"),
            title: `Created automation: ${input.name}`,
            kind: "automation",
            description: input.description,
            createdAt: Date.now(),
            source: "Automations",
          },
          ...s.activity,
        ],
      }));
    },
    []
  );

  const removeAutomation = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      automations: s.automations.filter((a) => a.id !== id),
    }));
  }, []);

  const runAutomationNow = React.useCallback((id: string) => {
    setState((s) => {
      const auto = s.automations.find((a) => a.id === id);
      if (!auto) return s;
      return {
        ...s,
        automations: s.automations.map((a) =>
          a.id === id ? { ...a, lastRun: Date.now(), runs: a.runs + 1 } : a
        ),
        activity: [
          {
            id: uid("act"),
            title: `Ran automation: ${auto.name}`,
            kind: "automation",
            description: auto.description,
            createdAt: Date.now(),
            source: auto.name,
          },
          ...s.activity,
        ],
      };
    });
  }, []);

  const resetWorkspace = React.useCallback(() => {
    setState(seedState());
  }, []);

  const connectedCount = state.integrations.filter((i) => i.connected).length;

  const value: ViktorContextValue = {
    ...state,
    ready,
    connectedCount,
    sendTask,
    newConversation,
    deleteConversation,
    getConversation,
    toggleIntegration,
    toggleAutomation,
    addAutomation,
    removeAutomation,
    runAutomationNow,
    resetWorkspace,
  };

  return (
    <ViktorContext.Provider value={value}>{children}</ViktorContext.Provider>
  );
}

export function useViktor() {
  const ctx = React.useContext(ViktorContext);
  if (!ctx) throw new Error("useViktor must be used within ViktorProvider");
  return ctx;
}
