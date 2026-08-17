"use client";

import * as React from "react";
import { Check, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { setTheme, type AppSpec } from "@/lib/loom/app";
import {
  FONT_STACKS,
  PRESETS,
  RADIUS_STEPS,
  resolveTheme,
  themeFromPreset,
  type FontChoice,
} from "@/lib/loom/theme";
import { Term } from "@/components/term";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function ThemePanel({
  app,
  onChange,
}: {
  app: AppSpec;
  onChange: (next: AppSpec) => void;
}) {
  const theme = app.theme;
  const resolved = React.useMemo(() => resolveTheme(theme), [theme]);
  const failing = resolved.contrast.filter((c) => !c.passes);

  const patch = (next: Partial<typeof theme>) =>
    onChange(setTheme(app, { ...theme, ...next }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          The look and feel
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          A few choices that every screen draws from, so they look like they
          belong together. Change one and everything using it changes at once.
          This is your <Term of="design system">design system</Term> — it
          exports as a shadcn theme.
        </p>
      </div>

      <Row label="Start from" hint="A place to begin. Adjust anything after.">
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((preset) => {
            const active = theme.preset === preset.id;
            const swatch = resolveTheme(themeFromPreset(preset)).light[
              "--primary"
            ];
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-${preset.id}`}
                onClick={() => onChange(setTheme(app, themeFromPreset(preset)))}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40 hover:bg-accent/30"
                )}
              >
                <span
                  className="mt-0.5 size-5 shrink-0 rounded-full border"
                  style={{ background: swatch }}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {preset.label}
                    {active ? <Check className="size-3.5 text-primary" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {preset.note}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Row>

      <Row
        label="Your main colour"
        hint="Used for anything people are meant to press, and anything the app wants them to notice."
      >
        <input
          type="range"
          min={0}
          max={359}
          value={theme.primaryHue}
          data-testid="theme-hue"
          onChange={(e) =>
            patch({ primaryHue: Number(e.target.value), preset: "custom" })
          }
          aria-label="Main colour"
          className="h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background:
              "linear-gradient(to right, oklch(0.6 0.2 0), oklch(0.6 0.2 60), oklch(0.6 0.2 120), oklch(0.6 0.2 180), oklch(0.6 0.2 240), oklch(0.6 0.2 300), oklch(0.6 0.2 360))",
          }}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">How strong</span>
          <input
            type="range"
            min={0}
            max={26}
            value={Math.round(theme.primaryChroma * 100)}
            onChange={(e) =>
              patch({
                primaryChroma: Number(e.target.value) / 100,
                preset: "custom",
              })
            }
            aria-label="How strong the colour is"
            className="h-2 flex-1 cursor-pointer"
          />
          <span
            className="size-6 shrink-0 rounded-md border"
            style={{ background: resolved.light["--primary"] }}
          />
        </div>
      </Row>

      <Row
        label="Corners"
        hint="Softer corners read as friendlier. Sharper ones read as more serious."
      >
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_STEPS.map((step) => (
            <button
              key={step.value}
              type="button"
              onClick={() => patch({ radius: step.value, preset: "custom" })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                theme.radius === step.value
                  ? "border-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Type" hint="What everything is set in.">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FONT_STACKS) as FontChoice[])
            .filter((f) => f !== "mono")
            .map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => patch({ fontSans: font })}
                style={{ fontFamily: FONT_STACKS[font].stack }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  theme.fontSans === font
                    ? "border-primary bg-primary/15"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {FONT_STACKS[font].label}
              </button>
            ))}
        </div>
      </Row>

      <Row
        label="Can people read it?"
        hint={
          <>
            Text needs enough <Term of="contrast">contrast</Term> against what&apos;s
            behind it. 4.5 to 1 is the usual minimum — below that, some people
            can&apos;t read it comfortably in bright light.
          </>
        }
      >
        <ul className="space-y-1.5" data-testid="contrast-checks">
          {resolved.contrast.map((c) => (
            <li
              key={`${c.label}-${c.where}`}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                c.passes ? "text-muted-foreground" : "border-amber-500/40 bg-amber-500/5"
              )}
            >
              {c.passes ? (
                <Check className="size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <TriangleAlert className="size-3.5 shrink-0 text-amber-500" />
              )}
              <span className="flex-1">
                <span className="font-medium text-foreground">{c.label}</span> —{" "}
                {c.where}
              </span>
              <span className="shrink-0 font-mono tabular-nums">
                {c.ratio}:1
              </span>
            </li>
          ))}
        </ul>
        {failing.length > 0 ? (
          <p className="text-xs leading-relaxed text-amber-500">
            {failing.length === 1 ? "One pair is" : `${failing.length} pairs are`}{" "}
            harder to read than the minimum. Try a darker main colour, or a
            stronger one.
          </p>
        ) : null}
      </Row>
    </div>
  );
}
