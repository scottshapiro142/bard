"use client";

import * as React from "react";
import { Monitor, Smartphone, Sun, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import { enabledScreens, type AppSpec } from "@/lib/loom/app";
import { resolveTheme, tokensToStyle } from "@/lib/loom/theme";
import { SCREEN_STATES } from "@/lib/loom/app";
import { ScreenPreview, type PreviewState } from "./screens";

/**
 * The app, as it stands.
 *
 * The theme is applied as CSS custom properties on the wrapper. Because
 * globals.css uses `@theme inline`, Tailwind utilities resolve to those
 * variables directly, so everything inside picks up the designer's design
 * system without an iframe or a rebuild.
 */
export function AppPreview({
  app,
  screenId,
  onScreenChange,
  className,
}: {
  app: AppSpec;
  screenId?: string;
  onScreenChange?: (id: string) => void;
  className?: string;
}) {
  const screens = enabledScreens(app);
  const [internalId, setInternalId] = React.useState(screens[0]?.id);
  const [state, setState] = React.useState<PreviewState>("ready");
  const [device, setDevice] = React.useState<"desktop" | "phone">("desktop");
  const [mode, setMode] = React.useState<"light" | "dark">("light");

  const activeId = screenId ?? internalId;
  const screen = screens.find((s) => s.id === activeId) ?? screens[0];

  const select = (id: string) => {
    setInternalId(id);
    setState("ready");
    onScreenChange?.(id);
  };

  // A situation the current screen can't show falls back to normal. Derived
  // rather than stored, so switching screens can't leave a stale selection.
  const shown: PreviewState =
    state !== "ready" && screen && !screen.states.includes(state)
      ? "ready"
      : state;

  const resolved = React.useMemo(() => resolveTheme(app.theme), [app.theme]);
  const tokens = mode === "dark" ? resolved.dark : resolved.light;

  if (!screen) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Every screen is switched off. Turn one on in Screens to see it here.
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <select
          value={screen.id}
          onChange={(e) => select(e.target.value)}
          data-testid="preview-screen"
          className="h-8 rounded-md border bg-background px-2 text-sm"
          aria-label="Screen to preview"
        >
          {screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={shown}
          onChange={(e) => setState(e.target.value as PreviewState)}
          data-testid="preview-state"
          className="h-8 rounded-md border bg-background px-2 text-sm"
          aria-label="Situation to preview"
        >
          <option value="ready">Normal</option>
          {SCREEN_STATES.filter((s) => screen.states.includes(s.value)).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDevice(device === "desktop" ? "phone" : "desktop")}
            aria-label={device === "desktop" ? "Show on a phone" : "Show on a desktop"}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {device === "desktop" ? (
              <Monitor className="size-4" />
            ) : (
              <Smartphone className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            data-testid="preview-mode"
            aria-label={mode === "light" ? "Show dark mode" : "Show light mode"}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {mode === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/20 p-4">
        <div
          data-testid="preview-surface"
          data-screen={screen.id}
          data-mode={mode}
          className={cn(
            "overflow-hidden rounded-xl border shadow-sm transition-all",
            mode === "dark" && "dark",
            device === "phone" ? "w-[390px]" : "w-full max-w-3xl"
          )}
          style={tokensToStyle(tokens, app.theme)}
        >
          <ScreenPreview app={app} screen={screen} state={shown} />
        </div>
      </div>

      <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        A working preview of {screen.route} built from your answers — not the
        exported code running. Structure always matches; small styling
        differences are possible.
      </p>
    </div>
  );
}
