"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { Graph, NodeStatus, RunState } from "@/lib/loom/types";

const NODE_W = 172;
const NODE_H = 48;
const GAP_Y = 14;
const COL_X = [8, 228, 448];
const WIDTH = COL_X[2] + NODE_W + 8;

const STATUS_STYLE: Record<NodeStatus, { box: string; label: string; dot: string }> =
  {
    blocked: {
      box: "fill-card stroke-border",
      label: "fill-muted-foreground",
      dot: "fill-muted-foreground/40",
    },
    pending: {
      box: "fill-card stroke-border",
      label: "fill-muted-foreground",
      dot: "fill-muted-foreground/40",
    },
    running: {
      box: "fill-primary/15 stroke-primary",
      label: "fill-foreground",
      dot: "fill-primary",
    },
    done: {
      box: "fill-emerald-500/10 stroke-emerald-500/60",
      label: "fill-foreground",
      dot: "fill-emerald-500",
    },
  };

interface Placed {
  id: string;
  title: string;
  output: string;
  x: number;
  y: number;
  status: NodeStatus;
}

/**
 * The graph, drawn. Leaves stack in the first column because they all run at
 * once; the checker and the summary sit downstream because they can't.
 */
export function GraphCanvas({
  graph,
  run,
  selected,
  onSelect,
  className,
}: {
  graph: Graph;
  run?: RunState | null;
  selected?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const leaves = graph.nodes.filter((n) => n.kind === "leaf");
  const checker = graph.nodes.find((n) => n.kind === "checker");
  const summary = graph.nodes.find((n) => n.kind === "summary");

  const columnHeight = Math.max(
    leaves.length * (NODE_H + GAP_Y) - GAP_Y,
    NODE_H
  );
  const height = columnHeight + 16;
  const centerY = 8 + columnHeight / 2 - NODE_H / 2;

  const statusOf = (id: string): NodeStatus =>
    run?.nodes[id]?.status ?? (graph.nodes.find((n) => n.id === id)?.dependsOn.length ? "blocked" : "pending");

  const placed: Placed[] = leaves.map((node, i) => ({
    id: node.id,
    title: node.title,
    output: node.output,
    x: COL_X[0],
    y: 8 + i * (NODE_H + GAP_Y),
    status: statusOf(node.id),
  }));

  if (checker) {
    placed.push({
      id: checker.id,
      title: checker.title,
      output: checker.output,
      x: COL_X[1],
      y: centerY,
      status: statusOf(checker.id),
    });
  }
  if (summary) {
    placed.push({
      id: summary.id,
      title: summary.title,
      output: summary.output,
      x: COL_X[2],
      y: centerY,
      status: statusOf(summary.id),
    });
  }

  const byId = new Map(placed.map((p) => [p.id, p]));

  const edges: { from: Placed; to: Placed; active: boolean }[] = [];
  for (const node of graph.nodes) {
    for (const dep of node.dependsOn) {
      const from = byId.get(dep);
      const to = byId.get(node.id);
      if (from && to) {
        edges.push({
          from,
          to,
          active: from.status === "done" && to.status !== "blocked",
        });
      }
    }
  }

  if (placed.length === 0) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground",
          className
        )}
      >
        The graph builds itself as you answer.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={`Workflow graph with ${graph.nodes.length} nodes`}
    >
      {edges.map(({ from, to, active }, i) => {
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mid = (x1 + x2) / 2;
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
            fill="none"
            strokeWidth={1.5}
            className={cn(
              "transition-colors",
              active ? "stroke-emerald-500/60" : "stroke-border"
            )}
          />
        );
      })}

      {placed.map((node) => {
        const style = STATUS_STYLE[node.status];
        const isSelected = selected === node.id;
        return (
          <g
            key={node.id}
            onClick={onSelect ? () => onSelect(node.id) : undefined}
            className={cn(
              onSelect && "cursor-pointer",
              node.status === "running" && "animate-pulse"
            )}
            data-node={node.id}
            data-status={node.status}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
              rx={10}
              strokeWidth={isSelected ? 2 : 1}
              className={cn(
                style.box,
                "transition-colors",
                isSelected && "stroke-primary"
              )}
            />
            <circle
              cx={node.x + 16}
              cy={node.y + NODE_H / 2}
              r={4}
              className={style.dot}
            />
            <text
              x={node.x + 30}
              y={node.y + 20}
              className={cn("text-[11px] font-medium", style.label)}
            >
              {node.title}
            </text>
            <text
              x={node.x + 30}
              y={node.y + 34}
              className="fill-muted-foreground font-mono text-[9px]"
            >
              {node.output}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
