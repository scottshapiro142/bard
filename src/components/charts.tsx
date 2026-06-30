"use client";

import * as React from "react";

/** A minimal dependency-free line/area chart. */
export function AreaChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const width = 520;
  const padX = 8;
  const padY = 16;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = (width - padX * 2) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (d.value - min) / range) * (height - padY * 2);
    return { x, y, ...d };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area =
    `M ${points[0].x} ${height - padY} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${height - padY} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--color-background)"
            stroke="var(--color-primary)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** A horizontal bar comparison chart. */
export function BarList({
  data,
  formatValue = (v: number) => `${v}`,
}: {
  data: { label: string; value: number; hint?: string }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{d.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatValue(d.value)}
              {d.hint ? (
                <span className="ml-1 text-xs">{d.hint}</span>
              ) : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
