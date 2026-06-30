import { cn } from "@/lib/utils";

export function ViktorMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-sm",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 5l4.5 12L12 9l2.5 8L19 5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ViktorWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ViktorMark />
      <span className="text-lg font-semibold tracking-tight">Viktor</span>
    </div>
  );
}
