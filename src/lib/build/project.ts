import { plural } from "../loom/brief";
import {
  enabledScreens,
  pascal,
  primaryOf,
  type AppSpec,
} from "../loom/app";
import { generateScaffold, type ScaffoldInput } from "../loom/scaffold";
import type { ScaffoldFile } from "../loom/types";

/**
 * A complete, runnable Next.js project — not just the app-specific files the
 * scaffold produces, but everything around them a machine needs to actually
 * `npm install && npm run build`: the config, the layout, the API routes the
 * generated screens call, and a home page.
 *
 * The scaffold answers "what does this app look like". This answers "what does
 * it take to run it". Kept apart because the scaffold is what a designer reads,
 * and this is what a build agent works inside.
 */

/** Pinned to this workspace's versions, so a reused node_modules verifies the
 * same code the download will install. */
const DEPS: Record<string, string> = {
  next: "16.2.9",
  react: "19.2.4",
  "react-dom": "19.2.4",
  "tw-animate-css": "^1.4.0",
};

const DEV_DEPS: Record<string, string> = {
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  tailwindcss: "^4",
  typescript: "^5",
};

function packageJson(name: string): ScaffoldFile {
  return {
    path: "package.json",
    language: "json",
    because:
      "Pinned to the same versions Loom itself runs, so the app that builds here builds the same on your machine.",
    contents:
      JSON.stringify(
        {
          name: name || "app",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: DEPS,
          devDependencies: DEV_DEPS,
        },
        null,
        2
      ) + "\n",
  };
}

function tsconfig(): ScaffoldFile {
  return {
    path: "tsconfig.json",
    language: "json",
    because:
      "Strict, and `@/` points at the project root — the same import style the generated screens use.",
    contents:
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "react-jsx",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] },
          },
          include: [
            "next-env.d.ts",
            "**/*.ts",
            "**/*.tsx",
            ".next/types/**/*.ts",
          ],
          exclude: ["node_modules"],
        },
        null,
        2
      ) + "\n",
  };
}

function staticFiles(): ScaffoldFile[] {
  return [
    {
      path: "next.config.ts",
      language: "ts",
      because: "Left plain on purpose — nothing here needs custom config yet.",
      contents:
        'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n',
    },
    {
      path: "postcss.config.mjs",
      language: "js" as ScaffoldFile["language"],
      because: "The one line Tailwind v4 needs.",
      contents:
        'const config = {\n  plugins: {\n    "@tailwindcss/postcss": {},\n  },\n};\n\nexport default config;\n',
    },
    {
      path: "next-env.d.ts",
      language: "ts",
      because: "Next generates this; committed so a fresh checkout typechecks.",
      contents:
        '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.\n',
    },
    {
      path: ".gitignore",
      language: "md" as ScaffoldFile["language"],
      because: "Keeps build output and dependencies out of version control.",
      contents: ["/node_modules", "/.next", "/out", ".DS_Store", ""].join("\n"),
    },
  ];
}

function layout(): ScaffoldFile {
  return {
    path: "app/layout.tsx",
    language: "tsx",
    because:
      "Loads the fonts your theme names and pulls in globals.css, so every screen inherits the design system.",
    contents: [
      'import type { Metadata } from "next";',
      'import { Geist, Geist_Mono } from "next/font/google";',
      'import "./globals.css";',
      "",
      "const geistSans = Geist({",
      '  variable: "--font-geist-sans",',
      '  subsets: ["latin"],',
      "});",
      "",
      "const geistMono = Geist_Mono({",
      '  variable: "--font-geist-mono",',
      '  subsets: ["latin"],',
      "});",
      "",
      "export const metadata: Metadata = {",
      '  title: "Built with Loom",',
      "};",
      "",
      "export default function RootLayout({",
      "  children,",
      "}: Readonly<{ children: React.ReactNode }>) {",
      "  return (",
      "    <html",
      "      lang=\"en\"",
      "      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}",
      "    >",
      '      <body className="min-h-full bg-background text-foreground">',
      "        {children}",
      "      </body>",
      "    </html>",
      "  );",
      "}",
      "",
    ].join("\n"),
  };
}

function homePage(app: AppSpec): ScaffoldFile {
  const screens = enabledScreens(app);
  const primary = primaryOf(app);
  const landing =
    screens.find((s) => s.kind === "list" && s.entityId === primary.id) ??
    screens.find((s) => s.kind === "list") ??
    screens.find((s) => s.kind === "auth") ??
    screens[0];

  if (landing) {
    return {
      path: "app/page.tsx",
      language: "tsx",
      because: `Sends people straight to ${landing.route} — the screen this app opens on.`,
      contents: [
        'import { redirect } from "next/navigation";',
        "",
        "export default function Home() {",
        `  redirect("${landing.route}");`,
        "}",
        "",
      ].join("\n"),
    };
  }

  return {
    path: "app/page.tsx",
    language: "tsx",
    because: "A placeholder home, until there's a screen to land on.",
    contents: [
      "export default function Home() {",
      "  return (",
      '    <main className="mx-auto max-w-2xl p-8">',
      '      <h1 className="text-xl font-semibold tracking-tight">Built with Loom</h1>',
      "    </main>",
      "  );",
      "}",
      "",
    ].join("\n"),
  };
}

/** The create screens POST to `/api<base>`; each needs a handler behind it. */
function apiRoutes(app: AppSpec): ScaffoldFile[] {
  const screens = enabledScreens(app);
  const out: ScaffoldFile[] = [];
  const seen = new Set<string>();

  for (const create of screens.filter((s) => s.kind === "create")) {
    const entity = app.entities.find((e) => e.id === create.entityId);
    if (!entity) continue;
    const base = create.route.replace(/\/new$/, "");
    if (seen.has(base)) continue;
    seen.add(base);

    const Type = pascal(entity.name);
    const many = pascal(plural(entity.name));
    const listScreen = screens.find(
      (s) => s.kind === "list" && s.entityId === entity.id
    );

    const apiPath = `app/api${base}/route.ts`;
    out.push({
      path: apiPath,
      language: "ts",
      because: `Stands behind the "${create.name}" form. The create page posts here; this is where a ${entity.name.toLowerCase()} actually gets made.`,
      contents: [
        `import { create${Type}${listScreen ? `, list${many}` : ""} } from "@/lib/data";`,
        `import type { ${Type} } from "@/lib/types";`,
        "",
        listScreen
          ? `export async function GET() {\n  return Response.json(await list${many}());\n}\n`
          : null,
        "export async function POST(request: Request) {",
        "  const body = await request.json();",
        "  // The form sends the fields it collected. Anything required that isn't",
        "  // here is left for you to add as the form grows.",
        `  const record = await create${Type}(`,
        `    body as Omit<${Type}, "id" | "createdAt">`,
        "  );",
        "  return Response.json(record, { status: 201 });",
        "}",
        "",
      ]
        .filter((l): l is string => typeof l === "string")
        .join("\n"),
    });
  }

  return out;
}

function readmeFor(name: string): ScaffoldFile {
  return {
    path: "README.md",
    language: "md",
    because: "How to run it, for whoever opens the folder next.",
    contents: [
      `# ${name || "Built with Loom"}`,
      "",
      "A real, runnable Next.js app. Loom generated and verified it.",
      "",
      "## Run it",
      "",
      "```bash",
      "npm install",
      "npm run dev",
      "```",
      "",
      "Then open http://localhost:3000.",
      "",
      "## What's here",
      "",
      "- `app/` — every screen, one folder each.",
      "- `app/api/` — the endpoints the forms post to.",
      "- `lib/types.ts` — what the app keeps about each thing.",
      "- `lib/data.ts` — one module in front of storage. Swap the in-memory",
      "  maps for a database and the screens don't change.",
      "- `docs/` — the whole project explained in plain language.",
      "",
      "Anywhere the reviews found an open question, the code stops and says so in",
      "a `TODO(loom)` comment rather than guessing. Those are the decisions still",
      "yours to make.",
      "",
    ].join("\n"),
  };
}

export interface AssembleInput extends ScaffoldInput {
  /** Project name, for package.json and the README. */
  name: string;
}

/**
 * The whole project, ready to install and build.
 *
 * `scaffold` files come first because they're what the designer already saw in
 * the Code tab; the rest is the frame that makes them run.
 */
export function assembleProject(input: AssembleInput): ScaffoldFile[] {
  const { name, app } = input;
  const scaffold = generateScaffold(input);

  const files: ScaffoldFile[] = [
    packageJson(name),
    tsconfig(),
    ...staticFiles(),
    layout(),
    homePage(app),
    ...apiRoutes(app),
    readmeFor(name),
    ...scaffold,
  ];

  // A stable order and no accidental duplicate paths.
  const byPath = new Map<string, ScaffoldFile>();
  for (const file of files) byPath.set(file.path, file);
  return [...byPath.values()];
}
