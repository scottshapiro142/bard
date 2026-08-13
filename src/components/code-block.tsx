"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Enough highlighting for the workflow format, and nothing more. */
function highlight(line: string, key: number) {
  const comment = line.match(/^(\s*)(#.*)$/);
  if (comment) {
    return (
      <span key={key} className="text-muted-foreground/60">
        {line}
      </span>
    );
  }

  const keyValue = line.match(/^(\s*)([\w-]+):(.*)$/);
  if (keyValue) {
    const [, indent, name, rest] = keyValue;
    return (
      <span key={key}>
        {indent}
        <span className="text-primary">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-foreground/80">{rest}</span>
      </span>
    );
  }

  return (
    <span key={key} className="text-foreground/80">
      {line}
    </span>
  );
}

export function CodeBlock({
  code,
  filename,
  className,
  maxHeight,
}: {
  code: string;
  filename?: string;
  className?: string;
  maxHeight?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the text is selectable either way
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {filename ?? "workflow.yaml"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="ml-auto h-7 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
      <pre
        className="overflow-auto p-4 font-mono text-xs leading-relaxed"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code>
          {code.split("\n").map((line, i) => (
            <React.Fragment key={i}>
              {highlight(line, i)}
              {"\n"}
            </React.Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
