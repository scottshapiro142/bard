/**
 * The design system the designer authors for their app.
 *
 * Four decisions generate the whole shadcn token set. Light and dark are
 * produced together from the same inputs so they can't drift apart — a theme
 * that looks considered in one mode and accidental in the other is the usual
 * failure of hand-edited token lists.
 */
export interface Theme {
  preset: string;
  /** Brand hue, 0–360. */
  primaryHue: number;
  /** How saturated the brand is, 0–0.3. */
  primaryChroma: number;
  /** Hue the greys lean toward. A trace of it keeps surfaces from going dead. */
  neutralHue: number;
  /** Corner radius in rem. */
  radius: number;
  fontSans: FontChoice;
  fontMono: FontChoice;
}

export type FontChoice = "geist" | "system" | "serif" | "mono";

export const FONT_STACKS: Record<FontChoice, { label: string; stack: string }> = {
  geist: {
    label: "Geist",
    stack: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  system: {
    label: "System",
    stack: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  serif: {
    label: "Serif",
    stack: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  },
  mono: {
    label: "Mono",
    stack: "var(--font-geist-mono), ui-monospace, monospace",
  },
};

export interface Preset {
  id: string;
  label: string;
  /** What this one is for — presets should suggest a use, not just a colour. */
  note: string;
  primaryHue: number;
  primaryChroma: number;
  neutralHue: number;
  radius: number;
}

export const PRESETS: Preset[] = [
  {
    id: "violet",
    label: "Violet",
    note: "Software-ish and confident. The default because it reads as a tool.",
    primaryHue: 285,
    primaryChroma: 0.2,
    neutralHue: 264,
    radius: 0.65,
  },
  {
    id: "ink",
    label: "Ink",
    note: "Almost no colour. Lets content and photography carry the page.",
    primaryHue: 250,
    primaryChroma: 0.04,
    neutralHue: 250,
    radius: 0.35,
  },
  {
    id: "forest",
    label: "Forest",
    note: "Calm and non-urgent. Good where money or health is involved.",
    primaryHue: 155,
    primaryChroma: 0.15,
    neutralHue: 160,
    radius: 0.5,
  },
  {
    id: "ember",
    label: "Ember",
    note: "Warm and immediate. Suits consumer products that want to feel quick.",
    primaryHue: 45,
    primaryChroma: 0.17,
    neutralHue: 60,
    radius: 0.65,
  },
  {
    id: "rose",
    label: "Rose",
    note: "Personal and a bit editorial. Reads less like enterprise software.",
    primaryHue: 12,
    primaryChroma: 0.19,
    neutralHue: 350,
    radius: 1,
  },
  {
    id: "ocean",
    label: "Ocean",
    note: "The safe institutional choice. Trustworthy, rarely surprising.",
    primaryHue: 235,
    primaryChroma: 0.16,
    neutralHue: 240,
    radius: 0.5,
  },
];

export const RADIUS_STEPS = [
  { value: 0, label: "Square" },
  { value: 0.35, label: "Slight" },
  { value: 0.5, label: "Rounded" },
  { value: 0.65, label: "Soft" },
  { value: 1, label: "Pill" },
];

export function themeFromPreset(preset: Preset): Theme {
  return {
    preset: preset.id,
    primaryHue: preset.primaryHue,
    primaryChroma: preset.primaryChroma,
    neutralHue: preset.neutralHue,
    radius: preset.radius,
    fontSans: "geist",
    fontMono: "mono",
  };
}

export const DEFAULT_THEME = themeFromPreset(PRESETS[0]);

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

const round = (n: number, places = 3) => Number(n.toFixed(places));

function oklch(l: number, c: number, h: number) {
  return `oklch(${round(l)} ${round(c)} ${round(h, 1)})`;
}

/** oklch -> linear sRGB. Values may fall outside 0–1 when out of gamut. */
export function oklchToLinearRgb(
  L: number,
  C: number,
  H: number
): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** WCAG relative luminance, which wants linearised channel values. */
export function relativeLuminance(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearRgb(L, C, H).map((v) =>
    Math.min(1, Math.max(0, v))
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function contrastRatio(a: Oklch, b: Oklch): number {
  const la = relativeLuminance(a.l, a.c, a.h);
  const lb = relativeLuminance(b.l, b.c, b.h);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Near-white or near-black, whichever survives on top of the given colour. */
function readableOn(base: Oklch, neutralHue: number): Oklch {
  const light: Oklch = { l: 0.985, c: 0.002, h: neutralHue };
  const dark: Oklch = { l: 0.18, c: 0.02, h: neutralHue };
  return contrastRatio(base, light) >= contrastRatio(base, dark) ? light : dark;
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

export type TokenSet = Record<string, string>;

export interface ResolvedTheme {
  light: TokenSet;
  dark: TokenSet;
  /** Pairs worth checking, with their measured ratio. */
  contrast: ContrastCheck[];
}

export interface ContrastCheck {
  label: string;
  /** Where this pair appears, in words a designer recognises. */
  where: string;
  ratio: number;
  passes: boolean;
}

function chartHues(hue: number): number[] {
  return [0, 55, 110, 175, 240].map((offset) => (hue + offset) % 360);
}

function buildLight(theme: Theme): { tokens: TokenSet; probes: Oklch[] } {
  const { primaryHue: ph, primaryChroma: pc, neutralHue: nh } = theme;

  const background: Oklch = { l: 0.99, c: 0.003, h: nh };
  const foreground: Oklch = { l: 0.21, c: 0.02, h: nh };
  const primary: Oklch = { l: 0.55, c: pc, h: ph };
  const primaryFg = readableOn(primary, nh);
  const muted: Oklch = { l: 0.96, c: 0.008, h: nh };
  const mutedFg: Oklch = { l: 0.53, c: 0.02, h: nh };

  const tokens: TokenSet = {
    "--background": oklch(background.l, background.c, background.h),
    "--foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--card": oklch(1, 0, 0),
    "--card-foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--popover": oklch(1, 0, 0),
    "--popover-foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--primary": oklch(primary.l, primary.c, primary.h),
    "--primary-foreground": oklch(primaryFg.l, primaryFg.c, primaryFg.h),
    "--secondary": oklch(muted.l, muted.c, muted.h),
    "--secondary-foreground": oklch(0.28, 0.03, nh),
    "--muted": oklch(muted.l, muted.c, muted.h),
    "--muted-foreground": oklch(mutedFg.l, mutedFg.c, mutedFg.h),
    "--accent": oklch(0.95, Math.min(pc * 0.2, 0.05), ph),
    "--accent-foreground": oklch(0.3, Math.min(pc * 0.5, 0.1), ph),
    "--destructive": oklch(0.58, 0.24, 27),
    "--destructive-foreground": oklch(0.985, 0, 0),
    "--border": oklch(0.92, 0.008, nh),
    "--input": oklch(0.92, 0.008, nh),
    "--ring": oklch(primary.l, primary.c, primary.h),
    "--radius": `${theme.radius}rem`,
  };

  chartHues(ph).forEach((h, i) => {
    tokens[`--chart-${i + 1}`] = oklch(0.62, Math.max(pc, 0.12), h);
  });

  tokens["--sidebar"] = oklch(0.985, 0.004, nh);
  tokens["--sidebar-foreground"] = tokens["--foreground"];
  tokens["--sidebar-primary"] = tokens["--primary"];
  tokens["--sidebar-primary-foreground"] = tokens["--primary-foreground"];
  tokens["--sidebar-accent"] = tokens["--muted"];
  tokens["--sidebar-accent-foreground"] = tokens["--secondary-foreground"];
  tokens["--sidebar-border"] = tokens["--border"];
  tokens["--sidebar-ring"] = tokens["--ring"];

  return { tokens, probes: [background, foreground, primary, primaryFg, muted, mutedFg] };
}

function buildDark(theme: Theme): { tokens: TokenSet; probes: Oklch[] } {
  const { primaryHue: ph, primaryChroma: pc, neutralHue: nh } = theme;

  const background: Oklch = { l: 0.17, c: 0.012, h: nh };
  const foreground: Oklch = { l: 0.97, c: 0.005, h: nh };
  const primary: Oklch = { l: 0.7, c: Math.min(pc * 0.95, 0.2), h: ph };
  const primaryFg = readableOn(primary, nh);
  const card: Oklch = { l: 0.21, c: 0.015, h: nh };
  const muted: Oklch = { l: 0.27, c: 0.02, h: nh };
  const mutedFg: Oklch = { l: 0.71, c: 0.02, h: nh };

  const tokens: TokenSet = {
    "--background": oklch(background.l, background.c, background.h),
    "--foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--card": oklch(card.l, card.c, card.h),
    "--card-foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--popover": oklch(card.l, card.c, card.h),
    "--popover-foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--primary": oklch(primary.l, primary.c, primary.h),
    "--primary-foreground": oklch(primaryFg.l, primaryFg.c, primaryFg.h),
    "--secondary": oklch(muted.l, muted.c, muted.h),
    "--secondary-foreground": oklch(foreground.l, foreground.c, foreground.h),
    "--muted": oklch(muted.l, muted.c, muted.h),
    "--muted-foreground": oklch(mutedFg.l, mutedFg.c, mutedFg.h),
    "--accent": oklch(0.3, Math.min(pc * 0.3, 0.06), ph),
    "--accent-foreground": oklch(0.92, Math.min(pc * 0.2, 0.05), ph),
    "--destructive": oklch(0.62, 0.23, 25),
    "--destructive-foreground": oklch(0.97, 0, 0),
    "--border": "oklch(1 0 0 / 10%)",
    "--input": "oklch(1 0 0 / 14%)",
    "--ring": oklch(primary.l, primary.c, primary.h),
    "--radius": `${theme.radius}rem`,
  };

  chartHues(ph).forEach((h, i) => {
    tokens[`--chart-${i + 1}`] = oklch(0.7, Math.max(pc, 0.12), h);
  });

  tokens["--sidebar"] = oklch(0.19, 0.013, nh);
  tokens["--sidebar-foreground"] = tokens["--foreground"];
  tokens["--sidebar-primary"] = tokens["--primary"];
  tokens["--sidebar-primary-foreground"] = tokens["--primary-foreground"];
  tokens["--sidebar-accent"] = tokens["--muted"];
  tokens["--sidebar-accent-foreground"] = tokens["--foreground"];
  tokens["--sidebar-border"] = "oklch(1 0 0 / 10%)";
  tokens["--sidebar-ring"] = tokens["--ring"];

  return { tokens, probes: [background, foreground, primary, primaryFg, muted, mutedFg] };
}

function check(
  label: string,
  where: string,
  a: Oklch,
  b: Oklch
): ContrastCheck {
  const ratio = contrastRatio(a, b);
  return { label, where, ratio: Number(ratio.toFixed(2)), passes: ratio >= 4.5 };
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  const light = buildLight(theme);
  const dark = buildDark(theme);

  const [lBg, lFg, lPrimary, lPrimaryFg, , lMutedFg] = light.probes;
  const [dBg, dFg, dPrimary, dPrimaryFg, , dMutedFg] = dark.probes;

  return {
    light: light.tokens,
    dark: dark.tokens,
    contrast: [
      check("Body text", "every screen, light mode", lFg, lBg),
      check("Quiet text", "hints, captions and labels, light mode", lMutedFg, lBg),
      check("Button label", "text on a primary button, light mode", lPrimaryFg, lPrimary),
      check("Body text", "every screen, dark mode", dFg, dBg),
      check("Quiet text", "hints, captions and labels, dark mode", dMutedFg, dBg),
      check("Button label", "text on a primary button, dark mode", dPrimaryFg, dPrimary),
    ],
  };
}

/** Tokens as inline style props, for the element that scopes the preview. */
export function tokensToStyle(tokens: TokenSet, theme: Theme): React.CSSProperties {
  const style: Record<string, string> = { ...tokens };
  style["--font-sans"] = FONT_STACKS[theme.fontSans].stack;
  style["--font-mono"] = FONT_STACKS[theme.fontMono].stack;
  style.fontFamily = FONT_STACKS[theme.fontSans].stack;
  return style as React.CSSProperties;
}

/** The theme as a globals.css the designer can drop into a shadcn project. */
export function themeToCss(theme: Theme): string {
  const { light, dark } = resolveTheme(theme);
  const block = (tokens: TokenSet) =>
    Object.entries(tokens)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n");

  return `/* Generated by Loom. Drop this into a shadcn project as globals.css. */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
${block(light)}
}

.dark {
${block(dark)}
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

${Object.keys(light)
  .filter((token) => token !== "--radius")
  .map((token) => `  --color-${token.slice(2)}: var(${token});`)
  .join("\n")}

  --font-sans: ${FONT_STACKS[theme.fontSans].stack};
  --font-mono: ${FONT_STACKS[theme.fontMono].stack};
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}
`;
}
