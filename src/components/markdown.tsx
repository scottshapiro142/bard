import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Inline `code` and **bold**. That's all the reviews use. */
export function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      out.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      out.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const SEVERITY_VARIANT = {
  critical: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

function Heading({ level, text, k }: { level: number; text: string; k: string }) {
  // `### [critical] Something` renders the severity as a badge.
  const tagged = text.match(/^\[(critical|medium|low)\]\s*(.*)$/);
  const body = tagged ? tagged[2] : text;
  const severity = tagged?.[1] as keyof typeof SEVERITY_VARIANT | undefined;

  const content = (
    <>
      {severity ? (
        <Badge variant={SEVERITY_VARIANT[severity]} className="mr-2 align-middle">
          {severity}
        </Badge>
      ) : null}
      {inline(body, k)}
    </>
  );

  if (level === 1)
    return (
      <h1 className="mt-8 mb-4 text-2xl font-semibold tracking-tight first:mt-0">
        {content}
      </h1>
    );
  if (level === 2)
    return (
      <h2 className="mt-8 mb-3 border-b pb-2 text-lg font-semibold tracking-tight first:mt-0">
        {content}
      </h2>
    );
  return (
    <h3 className="mt-6 mb-2 text-sm font-semibold tracking-tight first:mt-0">
      {content}
    </h3>
  );
}

/** The same inline formatting, for prose shown outside a markdown document. */
export function Inline({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}

/**
 * A small renderer for the markdown the graph produces. Not a general-purpose
 * one — it handles exactly the constructs the reviews emit.
 */
export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <Heading
          key={key++}
          level={heading[1].length}
          text={heading[2]}
          k={`h${key}`}
        />
      );
      i += 1;
      continue;
    }

    if (/^(---|___|\*\*\*)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-8 border-border" />);
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-4 border-l-2 border-primary/60 bg-muted/40 py-2 pr-3 pl-4 text-sm text-muted-foreground italic"
        >
          {inline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i += 1;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:text-primary marker:tabular-nums"
        >
          {items.map((item, n) => (
            <li key={n} className="pl-1">
              {inline(item, `o${key}-${n}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i += 1;
      }
      blocks.push(
        <ul
          key={key++}
          className="my-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-primary/60"
        >
          {items.map((item, n) => (
            <li key={n} className="pl-1">
              {inline(item, `u${key}-${n}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s|>\s|---)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    // A run of `**Label:** value` lines is a meta block, not prose — each one
    // keeps its own line instead of being joined into a paragraph.
    if (para.length > 1 && para.every((l) => /^\*\*[^*]+:\*\*/.test(l))) {
      blocks.push(
        <dl key={key++} className="my-3 space-y-1 text-sm text-muted-foreground">
          {para.map((line, n) => (
            <div key={n}>{inline(line, `m${key}-${n}`)}</div>
          ))}
        </dl>
      );
      continue;
    }

    blocks.push(
      <p key={key++} className="my-3 text-sm leading-relaxed text-muted-foreground">
        {inline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className={cn("max-w-none", className)}>{blocks}</div>;
}
