import type { Feature } from "./features";
import type {
  Checkpoint,
  CheckpointState,
  FeedbackNote,
  Task,
  TaskStatus,
} from "./types";

/**
 * The point of the whole thing: when a piece of the app is finished, say so in
 * plain words and hand it back to the person whose app it is.
 *
 * A checkpoint only fires for something you can actually open and try. Asking
 * someone to "test" a decision they made on paper would be theatre.
 */

export interface RaisedCheckpoint {
  feature: Feature;
  state: CheckpointState;
  /** Addressed to them, by name. */
  headline: string;
  body: string;
  /** Feedback already left against this feature, in their own words. */
  notes: FeedbackNote[];
}

/** A few phrasings, picked by feature so a project doesn't repeat one line. */
const BODIES = [
  "Have a look and tell us whether it works the way you expected.",
  "Give it a try. If anything feels off, say so — it's easier to change now than later.",
  "Worth a look before we build on top of it.",
];

function bodyFor(featureId: string) {
  let hash = 0;
  for (let i = 0; i < featureId.length; i++) {
    hash = (hash * 31 + featureId.charCodeAt(i)) % 997;
  }
  return BODIES[hash % BODIES.length];
}

function statusOf(taskId: string, statuses: Record<string, TaskStatus>) {
  return statuses[taskId] ?? "todo";
}

/** Everything in the feature that someone has to build before it's testable. */
function buildableTasks(feature: Feature, tasks: Task[]): Task[] {
  return tasks.filter(
    (t) => feature.taskIds.includes(t.id) && t.kind !== "review"
  );
}

export function checkpointFor(
  feature: Feature,
  tasks: Task[],
  statuses: Record<string, TaskStatus>,
  saved: Record<string, Checkpoint>,
  feedback: FeedbackNote[],
  designerName: string
): RaisedCheckpoint | null {
  if (!feature.previewScreenId) return null;

  const work = buildableTasks(feature, tasks);
  if (work.length === 0) return null;

  const record = saved[feature.id];
  const allDone = work.every((t) => statusOf(t.id, statuses) === "done");

  let state: CheckpointState;
  if (record?.state === "approved") {
    state = "approved";
  } else if (record?.state === "changes-requested") {
    // Once the work their feedback created is done, it's ready to look at again.
    state = allDone ? "ready" : "changes-requested";
  } else {
    state = allDone ? "ready" : "waiting";
  }

  if (state === "waiting") return null;

  const name = designerName.trim();
  const greeting = name ? `${name} — we` : "We";
  const headline =
    state === "approved"
      ? `${feature.title}: signed off`
      : `${greeting} just finished ${feature.title.toLowerCase()}.`;

  const body =
    state === "approved"
      ? "You've had a look at this one and it's good."
      : state === "changes-requested"
        ? "You asked for changes here. They're in the task list below."
        : bodyFor(feature.id);

  return {
    feature,
    state,
    headline,
    body,
    notes: feedback.filter((n) => n.featureId === feature.id),
  };
}

export function raisedCheckpoints(
  features: Feature[],
  tasks: Task[],
  statuses: Record<string, TaskStatus>,
  saved: Record<string, Checkpoint>,
  feedback: FeedbackNote[],
  designerName: string
): RaisedCheckpoint[] {
  return features
    .map((f) => checkpointFor(f, tasks, statuses, saved, feedback, designerName))
    .filter((c): c is RaisedCheckpoint => c !== null)
    .sort((a, b) => {
      // Anything still needing you comes before anything already settled.
      const rank = (s: CheckpointState) =>
        s === "ready" ? 0 : s === "changes-requested" ? 1 : 2;
      return rank(a.state) - rank(b.state);
    });
}

/**
 * The task that lands on the designer's plate when a checkpoint fires. A real
 * task — it sits in the list, counts toward progress, and can be ticked off.
 */
export function reviewTaskFor(checkpoint: RaisedCheckpoint): Task {
  return {
    id: `review-${checkpoint.feature.id}`,
    title: `Try out ${checkpoint.feature.title.toLowerCase()}`,
    detail: checkpoint.feature.whatItIs,
    plain: {
      what: `Open ${checkpoint.feature.title.toLowerCase()} and use it the way someone else would.`,
      why: "You're the only person who knows what this was supposed to feel like. Nothing else in the build can check that.",
      done: "You've either signed it off or written down what's wrong with it.",
    },
    milestone: "core",
    kind: "review",
    size: "S",
    source: "plan",
    tag: "review",
    blockedBy: [],
    featureId: checkpoint.feature.id,
    previewScreenId: checkpoint.feature.previewScreenId,
  };
}

/** Feedback becomes work, quoted rather than paraphrased. */
export function taskFromFeedback(note: FeedbackNote, feature: Feature): Task {
  return {
    id: `feedback-${note.id}`,
    title: `Fix what you found in ${feature.title.toLowerCase()}`,
    detail: `You wrote: "${note.text}"`,
    plain: {
      what: "Act on what you found when you tried it.",
      why: "You used it and something was off. That's the most direct evidence you have about this app.",
      done: "You've been back through it and it works the way you wanted.",
    },
    milestone: "core",
    kind: "build",
    size: "M",
    source: "finding",
    tag: "feedback-note",
    blockedBy: [],
    featureId: feature.id,
    previewScreenId: feature.previewScreenId,
  };
}
