"use client";

import * as React from "react";

import { compileGraph } from "./compile";
import { firstSentence } from "./brief";
import { EXAMPLE_ANSWERS } from "./example";
import type {
  Answers,
  LoomState,
  Project,
  RunState,
  TaskStatus,
} from "./types";

const STORAGE_KEY = "loom-state-v1";

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function nameFor(answers: Answers) {
  const product = (answers.product ?? "").trim();
  if (!product) return "Untitled project";
  const name = firstSentence(product);
  return name.length > 52 ? name.slice(0, 52).trim() + "…" : name;
}

function blankProject(answers: Answers = {}): Project {
  return {
    id: uid("p"),
    name: nameFor(answers),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    answers,
    cursor: 0,
    interviewComplete: false,
    graph: null,
    run: null,
    taskStatus: {},
  };
}

interface LoomContextValue extends LoomState {
  ready: boolean;
  createProject: () => string;
  createExampleProject: () => string;
  getProject: (id: string) => Project | undefined;
  deleteProject: (id: string) => void;
  setAnswer: (id: string, questionId: string, value: string) => void;
  setCursor: (id: string, cursor: number) => void;
  compile: (id: string) => void;
  setRun: (id: string, run: RunState | null) => void;
  setTaskStatus: (id: string, taskId: string, status: TaskStatus) => void;
  resetTasks: (id: string) => void;
}

const LoomContext = React.createContext<LoomContextValue | null>(null);

export function LoomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LoomState>({ projects: [] });
  const [ready, setReady] = React.useState(false);

  // Hydrate once from localStorage. Syncing React state from an external store
  // on mount is exactly what effects are for; the lint rule is a false positive.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LoomState>;
        if (Array.isArray(parsed.projects)) {
          // taskStatus arrived after the first release; older saves lack it.
          setState({
            projects: parsed.projects.map((p) => ({
              ...p,
              taskStatus: p.taskStatus ?? {},
            })),
          });
        }
      }
    } catch {
      // corrupt storage — start clean rather than crash
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — non-fatal, the app still works in-session
    }
  }, [state, ready]);

  const update = React.useCallback(
    (id: string, fn: (p: Project) => Project) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === id ? { ...fn(p), updatedAt: Date.now() } : p
        ),
      }));
    },
    []
  );

  const createProject = React.useCallback(() => {
    const project = blankProject();
    setState((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project.id;
  }, []);

  const createExampleProject = React.useCallback(() => {
    const project = blankProject(EXAMPLE_ANSWERS);
    project.interviewComplete = true;
    project.graph = compileGraph(EXAMPLE_ANSWERS);
    setState((s) => ({ ...s, projects: [project, ...s.projects] }));
    return project.id;
  }, []);

  const deleteProject = React.useCallback((id: string) => {
    setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
  }, []);

  const setAnswer = React.useCallback(
    (id: string, questionId: string, value: string) => {
      update(id, (p) => {
        const answers = { ...p.answers, [questionId]: value };
        return {
          ...p,
          answers,
          name: nameFor(answers),
          // An edited answer can change which reviews exist, so the graph and
          // any completed run are stale until recompiled.
          graph: p.interviewComplete ? compileGraph(answers) : p.graph,
        };
      });
    },
    [update]
  );

  const setCursor = React.useCallback(
    (id: string, cursor: number) => update(id, (p) => ({ ...p, cursor })),
    [update]
  );

  const compile = React.useCallback(
    (id: string) =>
      update(id, (p) => ({
        ...p,
        interviewComplete: true,
        graph: compileGraph(p.answers),
      })),
    [update]
  );

  const setRun = React.useCallback(
    (id: string, run: RunState | null) => update(id, (p) => ({ ...p, run })),
    [update]
  );

  const setTaskStatus = React.useCallback(
    (id: string, taskId: string, status: TaskStatus) =>
      update(id, (p) => ({
        ...p,
        taskStatus: { ...p.taskStatus, [taskId]: status },
      })),
    [update]
  );

  const resetTasks = React.useCallback(
    (id: string) => update(id, (p) => ({ ...p, taskStatus: {} })),
    [update]
  );

  const getProject = React.useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const value: LoomContextValue = {
    ...state,
    ready,
    createProject,
    createExampleProject,
    getProject,
    deleteProject,
    setAnswer,
    setCursor,
    compile,
    setRun,
    setTaskStatus,
    resetTasks,
  };

  return <LoomContext.Provider value={value}>{children}</LoomContext.Provider>;
}

export function useLoom() {
  const ctx = React.useContext(LoomContext);
  if (!ctx) throw new Error("useLoom must be used within a LoomProvider");
  return ctx;
}
