import type { Graph } from "./types";

const TASK_INDENT = " ".repeat(11); // aligns under the opening quote of `    task: "`
const WRAP_AT = 52;

/** Wrap a task string the way you'd hand-write it in the YAML. */
function wrapTask(task: string): string {
  const words = task.replace(/"/g, "'").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + 1 + word.length > WRAP_AT) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines
    .map((l, i) => (i === 0 ? l : TASK_INDENT + l))
    .join("\n");
}

/**
 * Render the graph in the workflow format — the same one you'd write by hand
 * for a code review. This is the artifact, not a preview of one.
 */
export function toYaml(graph: Graph): string {
  const out: string[] = [`workflow: ${graph.workflow}`, "", "nodes:"];

  graph.nodes.forEach((node, i) => {
    out.push(`  ${node.id}:`);
    out.push(`    task: "${wrapTask(node.task)}"`);
    if (node.dependsOn.length > 0) {
      out.push(`    depends_on: [${node.dependsOn.join(", ")}]`);
    }
    out.push(`    output: ${node.output}`);
    if (i < graph.nodes.length - 1) out.push("");
  });

  return out.join("\n") + "\n";
}

/** The example that started this — shown on the home page as the reference shape. */
export const REFERENCE_YAML = `workflow: code-review

nodes:
  review_auth:
    task: "Review auth.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_auth.md

  review_api:
    task: "Review api.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_api.md

  review_db:
    task: "Review db.py for security issues, edge cases,
           and code quality. Be specific."
    output: review_db.md

  checker:
    task: "Read all three reviews. Flag issues appearing in more than
           one file. Note cross-file dependencies that could cause problems."
    depends_on: [review_auth, review_api, review_db]
    output: checker.md

  summary:
    task: "Write a prioritized fix list — critical first,
           then medium, then low."
    depends_on: [checker]
    output: final_review.md
`;
