import { cn } from "@/lib/utils";

/** Three threads that converge — the shape of every graph this thing builds. */
export function LoomMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn("size-6", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6 C 14 6, 12 14, 22 14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M4 14 H 22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M4 22 C 14 22, 12 14, 22 14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="23" cy="14" r="3" fill="currentColor" />
    </svg>
  );
}

export function LoomWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LoomMark className="size-6 text-primary" />
      <span className="text-base font-semibold tracking-tight">Loom</span>
    </span>
  );
}
