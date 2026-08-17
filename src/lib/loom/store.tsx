"use client";

import * as React from "react";

import { compileGraph } from "./compile";
import { firstSentence } from "./brief";
import { EXAMPLE_ANSWERS, EXAMPLES } from "./example";
import type {
  Answers,
  CheckpointState,
  FeedbackNote,
  LoomState,
  Project,
  RunState,
  TaskStatus,
} from "./types";
import type { AppSpec } from "./app";

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
    app: null,
    designerName: "",
    checkpoints: {},
    feedback: [],
    decisions: {},
    brainToken: "",
  };
}

interface LoomContextValue extends LoomState {
  ready: boolean;
  createProject: () => string;
  createExampleProject: (exampleId?: string) => string;
  getProject: (id: string) => Project | undefined;
  deleteProject: (id: string) => void;
  setAnswer: (id: string, questionId: string, value: string) => void;
  setCursor: (id: string, cursor: number) => void;
  compile: (id: string) => void;
  setRun: (id: string, run: RunState | null) => void;
  setTaskStatus: (id: string, taskId: string, status: TaskStatus) => void;
  resetTasks: (id: string) => void;
  setApp: (id: string, app: AppSpec) => void;
  resetApp: (id: string) => void;
  setDesignerName: (id: string, name: string) => void;
  setCheckpoint: (id: string, featureId: string, state: CheckpointState) => void;
  addFeedback: (id: string, featureId: string, text: string) => void;
  answerQuestion: (id: string, taskId: string, answer: string) => void;
  setBrainToken: (id: string, token: string) => void;
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
            // Each of these arrived after an earlier release; older saves
            // predate them and must not crash on load.
            projects: parsed.projects.map((p) => ({
              ...p,
              taskStatus: p.taskStatus ?? {},
              app: p.app ?? null,
              designerName: p.designerName ?? "",
              checkpoints: p.checkpoints ?? {},
              feedback: p.feedback ?? [],
              decisions: p.decisions ?? {},
              brainToken: p.brainToken ?? "",
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

  const createExampleProject = React.useCallback((exampleId?: string) => {
    const answers =
      EXAMPLES.find((e) => e.id === exampleId)?.answers ?? EXAMPLE_ANSWERS;
    const project = blankProject(answers);
    project.interviewComplete = true;
    project.graph = compileGraph(answers);
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

  const setApp = React.useCallback(
    (id: string, app: AppSpec) => update(id, (p) => ({ ...p, app })),
    [update]
  );

  const resetApp = React.useCallback(
    (id: string) => update(id, (p) => ({ ...p, app: null })),
    [update]
  );

  const setDesignerName = React.useCallback(
    (id: string, designerName: string) =>
      update(id, (p) => ({ ...p, designerName })),
    [update]
  );

  const setCheckpoint = React.useCallback(
    (id: string, featureId: string, state: CheckpointState) =>
      update(id, (p) => ({
        ...p,
        checkpoints: {
          ...p.checkpoints,
          [featureId]: {
            featureId,
            state,
            raisedAt: p.checkpoints[featureId]?.raisedAt ?? Date.now(),
            respondedAt: Date.now(),
          },
        },
      })),
    [update]
  );

  const addFeedback = React.useCallback(
    (id: string, featureId: string, text: string) =>
      update(id, (p) => {
        const note: FeedbackNote = {
          id: uid("fb"),
          featureId,
          text: text.trim(),
          createdAt: Date.now(),
        };
        return {
          ...p,
          feedback: [...p.feedback, note],
          checkpoints: {
            ...p.checkpoints,
            [featureId]: {
              featureId,
              state: "changes-requested",
              raisedAt: p.checkpoints[featureId]?.raisedAt ?? Date.now(),
              respondedAt: Date.now(),
            },
          },
        };
      }),
    [update]
  );

  /** Answering is how a decision gets made, so it also settles the task. */
  const answerQuestion = React.useCallback(
    (id: string, taskId: string, answer: string) =>
      update(id, (p) => ({
        ...p,
        decisions: { ...p.decisions, [taskId]: answer.trim() },
        taskStatus: { ...p.taskStatus, [taskId]: "done" },
      })),
    [update]
  );

  const setBrainToken = React.useCallback(
    (id: string, brainToken: string) =>
      update(id, (p) => ({ ...p, brainToken })),
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
    setApp,
    resetApp,
    setDesignerName,
    setCheckpoint,
    addFeedback,
    answerQuestion,
    setBrainToken,
  };

  return <LoomContext.Provider value={value}>{children}</LoomContext.Provider>;
}

export function useLoom() {
  const ctx = React.useContext(LoomContext);
  if (!ctx) throw new Error("useLoom must be used within a LoomProvider");
  return ctx;
}
