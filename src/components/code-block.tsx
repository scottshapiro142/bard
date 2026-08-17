"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CodeLanguage = "yaml" | "ts" | "tsx" | "md" | "css" | "json";

const TS_TOKENS =
  /(\/\/.*$|\{\/\*[\s\S]*?\*\/\})|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|export|from|const|let|async|await|function|return|if|else|type|interface|new|throw|try|catch|null|default|as|of|void|true|false)\b/g;

/** Enough highlighting to read by. Not a parser. */
function highlight(line: string, key: number, language: CodeLanguage) {
  if (language === "yaml") {
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

  if (language === "css" || language === "json") {
    const comment = line.match(/^\s*(\/\*|\*|\/\/)/);
    if (comment) {
      return (
        <span key={key} className="text-muted-foreground/60 italic">
          {line}
        </span>
      );
    }
    const prop = line.match(/^(\s*)("?[\w@-]+"?)(\s*:)(.*)$/);
    if (prop) {
      const [, indent, name, colon, rest] = prop;
      return (
        <span key={key}>
          {indent}
          <span className="text-primary">{name}</span>
          <span className="text-muted-foreground">{colon}</span>
          <span className="text-emerald-400/80">{rest}</span>
        </span>
      );
    }
    return (
      <span key={key} className="text-foreground/80">
        {line}
      </span>
    );
  }

  if (language === "md") {
    if (/^#{1,6}\s/.test(line)) {
      return (
        <span key={key} className="font-semibold text-primary">
          {line}
        </span>
      );
    }
    if (/^\s*-\s/.test(line)) {
      return (
        <span key={key} className="text-foreground/80">
          {line}
        </span>
      );
    }
    return (
      <span key={key} className="text-muted-foreground">
        {line}
      </span>
    );
  }

  // TypeScript / TSX
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  TS_TOKENS.lastIndex = 0;

  while ((match = TS_TOKENS.exec(line)) !== null) {
    if (match.index > last) out.push(line.slice(last, match.index));
    const [token, comment, string_, keyword] = match;
    out.push(
      <span
        key={`${key}-${i++}`}
        className={
          comment
            ? "text-muted-foreground/60 italic"
            : string_
              ? "text-emerald-400/80"
              : keyword
                ? "text-primary"
                : undefined
        }
      >
        {token}
      </span>
    );
    last = match.index + token.length;
  }
  if (last < line.length) out.push(line.slice(last));

  return (
    <span key={key} className="text-foreground/80">
      {out}
    </span>
  );
}

export function CodeBlock({
  code,
  filename,
  className,
  maxHeight,
  language = "yaml",
  action,
}: {
  code: string;
  filename?: string;
  className?: string;
  maxHeight?: string;
  language?: CodeLanguage;
  action?: React.ReactNode;
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
        <span className="ml-auto" />
        {action}
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-7 gap-1.5 text-xs"
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
              {highlight(line, i, language)}
              {"\n"}
            </React.Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
