import { clause, deriveBrief, platformLabel, slugify } from "./brief";
import type { Answers, Graph, GraphNode } from "./types";

/**
 * Compile interview answers into a workflow graph.
 *
 * The shape is always the same: independent reviews fan out in parallel, a
 * checker reads all of them at once and looks for what no single review could
 * see, and a summary collapses everything into one prioritized list. Which
 * reviews exist depends on what the interview turned up.
 */
export function compileGraph(answers: Answers): Graph {
  const brief = deriveBrief(answers);
  const leaves: GraphNode[] = [];

  const leaf = (
    id: string,
    title: string,
    task: string,
    output: string
  ): GraphNode => ({ id, title, task, output, dependsOn: [], kind: "leaf" });

  leaves.push(
    leaf(
      "audience",
      "Audience",
      `Review who this is for: ${clause(answers.who ?? "", 70)} — is that narrow enough to design against? Compare it to how they work today. Be specific.`,
      "audience.md"
    )
  );

  leaves.push(
    leaf(
      "flows",
      "Core flows",
      `Map the primary flow: ${clause(answers.job ?? "", 70)} — step by step, every decision point, and what happens when each step fails. Be specific.`,
      "flows.md"
    )
  );

  leaves.push(
    leaf(
      "screens",
      "Screens & IA",
      `Inventory every screen this needs and what each one owns. Flag navigation depth and screens that exist only to hold a button. Be specific.`,
      "screens.md"
    )
  );

  leaves.push(
    leaf(
      "data_model",
      "Data model",
      `Review the data model — ${brief.entities.slice(0, 4).join(", ")}. Relationships, who owns each record, and what happens on delete. Be specific.`,
      "data_model.md"
    )
  );

  leaves.push(
    leaf(
      "edge_cases",
      "Edge cases",
      `Review the states nobody designs: empty, loading, error, offline, permission-denied, and two people editing at once. Be specific.`,
      "edge_cases.md"
    )
  );

  // ---- shape-specific reviews -------------------------------------------
  if (brief.type === "consumer") {
    leaves.push(
      leaf(
        "first_run",
        "First run",
        `Review the first 60 seconds: ${clause(answers.firstRun ?? "", 70)} — does it work before the user has entered anything? Be specific.`,
        "first_run.md"
      )
    );
  }
  if (brief.type === "internal") {
    leaves.push(
      leaf(
        "roles",
        "Roles & permissions",
        `Review the permission model: ${clause(answers.roles ?? "", 70)} — map every role against every screen and flag the gaps. Be specific.`,
        "roles.md"
      )
    );
  }
  if (brief.type === "marketplace") {
    leaves.push(
      leaf(
        "liquidity",
        "Cold start",
        `Review the cold-start problem: ${clause(answers.supply ?? "", 70)} — what does the first user see when the other side is empty? Be specific.`,
        "liquidity.md"
      )
    );
  }
  if (brief.type === "analytics") {
    leaves.push(
      leaf(
        "decision_loop",
        "Decision loop",
        `Review the decision this drives: ${clause(answers.decision ?? "", 70)} — trace the path from number to action and find where it breaks. Be specific.`,
        "decision_loop.md"
      )
    );
  }
  if (brief.type === "content") {
    leaves.push(
      leaf(
        "authoring",
        "Authoring lifecycle",
        `Review the lifecycle of a created thing: ${clause(answers.authoring ?? "", 70)} — drafts, versions, sharing, undo. Be specific.`,
        "authoring.md"
      )
    );
  }
  if (brief.type === "devtool") {
    leaves.push(
      leaf(
        "adoption",
        "Adoption path",
        `Review how this gets installed: ${clause(answers.install ?? "", 70)} — count the steps before first value. Be specific.`,
        "adoption.md"
      )
    );
  }
  if (brief.mobile) {
    leaves.push(
      leaf(
        "platform_native",
        "Platform fit",
        `Review this against native conventions on ${brief.platforms.map(platformLabel).join(" and ")} — navigation, permission prompts, and what happens with no signal. Be specific.`,
        "platform_native.md"
      )
    );
  }
  if (brief.production) {
    leaves.push(
      leaf(
        "scale_risk",
        "Scale risk",
        `Review what breaks when strangers use this unsupervised — abuse, volume, and the support burden each design choice creates. Be specific.`,
        "scale_risk.md"
      )
    );
  }

  const checker: GraphNode = {
    id: "checker",
    title: "Checker",
    task: `Read all ${leaves.length} reviews. Flag issues appearing in more than one. Note cross-review dependencies that could cause problems.`,
    dependsOn: leaves.map((n) => n.id),
    output: "checker.md",
    kind: "checker",
  };

  const summary: GraphNode = {
    id: "summary",
    title: "Spec",
    task: "Write a prioritized fix list — critical first, then medium, then low.",
    dependsOn: ["checker"],
    output: "spec.md",
    kind: "summary",
  };

  return {
    workflow: slugify(answers.product ?? "", "product-review"),
    nodes: [...leaves, checker, summary],
  };
}

/** Which answer has to exist before a node is real rather than assumed. */
const REQUIRES: Record<string, string> = {
  audience: "who",
  flows: "job",
  screens: "data",
  data_model: "data",
  edge_cases: "type",
  first_run: "firstRun",
  roles: "roles",
  liquidity: "supply",
  decision_loop: "decision",
  authoring: "authoring",
  adoption: "install",
  platform_native: "platform",
  scale_risk: "scale",
};

/**
 * The graph as it stands mid-interview — only the nodes whose inputs have
 * actually been answered. Used to show the graph assembling while you talk.
 */
export function previewGraph(answers: Answers): Graph {
  const full = compileGraph(answers);
  const leaves = full.nodes.filter((n) => {
    if (n.kind !== "leaf") return false;
    const required = REQUIRES[n.id];
    return !required || (answers[required] ?? "").trim().length > 0;
  });
  const ids = leaves.map((n) => n.id);

  const tail = full.nodes
    .filter((n) => n.kind !== "leaf")
    .map((n) =>
      n.kind === "checker"
        ? {
            ...n,
            dependsOn: ids,
            task: `Read all ${ids.length} reviews. Flag issues appearing in more than one. Note cross-review dependencies that could cause problems.`,
          }
        : n
    );

  return {
    workflow: full.workflow,
    nodes: leaves.length > 0 ? [...leaves, ...tail] : [],
  };
}

export function nodeById(graph: Graph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function leavesOf(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => n.kind === "leaf");
}
