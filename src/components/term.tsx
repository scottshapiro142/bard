"use client";

import * as React from "react";

import { glossaryTerm } from "@/lib/loom/plain";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A technical word with its meaning attached.
 *
 * The vocabulary stays — a designer working with developers needs the real
 * words — but nobody has to already know them. Definitions come from the same
 * glossary the generated docs use, so they can't disagree.
 */
export function Term({
  children,
  of,
}: {
  children: React.ReactNode;
  /** Glossary key, when it differs from the displayed text. */
  of?: string;
}) {
  const key = of ?? (typeof children === "string" ? children : "");
  const meaning = glossaryTerm(key);

  if (!meaning) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">{meaning}</TooltipContent>
    </Tooltip>
  );
}
