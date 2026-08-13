import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const EXE =
  process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

try {
  // 1. Home
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Interview in.", { timeout: 15000 });
  check("Home renders the hero", true);
  check(
    "Home shows the reference code-review workflow",
    (await page.locator("text=code-review.yaml").count()) > 0
  );

  // 2. Interview — adaptive branching and the live graph preview
  await page.getByTestId("start-interview").click();
  await page.waitForURL(/\/interview$/, { timeout: 10000 });
  await page.waitForSelector('[data-testid="question-prompt"]', { timeout: 10000 });
  check(
    "Interview opens on the first question",
    (await page.getByTestId("question-prompt").textContent()) ===
      "What are you building?"
  );

  const answer = async (text) => {
    await page.getByTestId("answer-input").fill(text);
    await page.getByTestId("next-question").click();
    await page.waitForTimeout(120);
  };

  await answer("A tool for booking rehearsal rooms by the hour.");
  await answer("Bands who rehearse weekly and share a room with three other bands.");
  await answer("Book a room for a specific hour without texting anyone.");

  // The type question branches the rest of the interview.
  await page.waitForSelector('[data-testid="option-marketplace"]', { timeout: 10000 });
  check("Interview reaches the branching question", true);
  await page.getByTestId("option-marketplace").click();
  await page.getByTestId("next-question").click();
  await page.waitForTimeout(150);

  await answer("A shared WhatsApp group and a paper calendar on the studio door.");

  const branched = await page.getByTestId("question-prompt").textContent();
  check(
    "Interview branches on product type",
    branched?.includes("harder to get"),
    branched ?? ""
  );

  const nodesInPreview = await page.locator("svg [data-node]").count();
  check(
    "Graph assembles live during the interview",
    nodesInPreview >= 3,
    `${nodesInPreview} nodes`
  );

  // 3. Example project — compiled graph
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByTestId("load-example").click();
  await page.waitForURL(/\/graph$/, { timeout: 10000 });
  await page.waitForSelector("text=The graph", { timeout: 10000 });

  const yaml = await page.locator("pre").first().innerText();
  check("Graph page emits the workflow YAML", yaml.includes("workflow:"));
  check("YAML declares depends_on for the checker", yaml.includes("depends_on:"));
  check(
    "YAML uses the same node keys as the graph",
    yaml.includes("checker:") && yaml.includes("summary:")
  );

  const graphNodes = await page.locator("svg [data-node]").count();
  check("Graph renders every node", graphNodes >= 7, `${graphNodes} nodes`);

  // 4. Run — parallel fan-out, then the checker
  await page.getByTestId("go-to-run").click();
  await page.waitForURL(/\/run$/, { timeout: 10000 });

  // The leaves should all be running at the same time before the checker starts.
  await page.waitForSelector('svg [data-status="running"]', { timeout: 10000 });
  const concurrent = await page.locator('svg [data-status="running"]').count();
  check(
    "Reviews run in parallel",
    concurrent > 1,
    `${concurrent} nodes running at once`
  );

  await page.waitForSelector('[data-testid="go-to-spec"]', { timeout: 40000 });
  check("Run completes", true);

  const logLines = await page.locator('[data-testid="run-log"] li').count();
  check("Run log records every node", logLines >= 9, `${logLines} lines`);

  // Read the checker's output from the run page.
  await page.locator('svg [data-node="checker"]').click();
  await page.waitForSelector("text=Issues appearing in more than one review", {
    timeout: 10000,
  });
  check("Checker cross-references the parallel reviews", true);
  check(
    "Checker surfaces the interviewee's stated worry",
    (await page.locator("text=Your stated worry").count()) > 0
  );

  // 5. Spec
  await page.getByTestId("go-to-spec").click();
  await page.waitForURL(/\/spec$/, { timeout: 10000 });
  await page.waitForSelector("text=What we're building", { timeout: 10000 });
  check("Spec renders the final document", true);

  const specText = await page.locator("main").innerText();
  check(
    "Spec is prioritised critical → medium → low",
    specText.includes("Fix first") && specText.includes("critical")
  );
  check(
    "Spec names what is out of scope",
    specText.includes("Out of scope")
  );

  // Every node wrote a file that can be opened.
  await page.getByTestId("file-audience").click();
  await page.waitForSelector("text=Audience review", { timeout: 10000 });
  check("Individual node outputs are readable as files", true);

  // 6. Build — tasks and scaffold
  await page.getByTestId("go-to-build").click();
  await page.waitForURL(/\/build$/, { timeout: 10000 });
  await page.waitForSelector("text=Decide", { timeout: 10000 });

  const taskCount = await page.locator("[data-task]").count();
  check("Spec compiles into a task list", taskCount > 15, `${taskCount} tasks`);
  check(
    "Tasks are grouped into milestones",
    (await page.locator("[data-milestone]").count()) >= 4
  );
  check(
    "Downstream work is blocked by open decisions",
    (await page.locator("text=blocked by").count()) > 0
  );

  // Toggling a task persists, and clearing a decision unblocks what waited on it.
  const blockedBefore = await page.locator("text=blocked by").count();
  const decisions = page.locator('[data-milestone="decide"] [data-task]');
  const decisionCount = await decisions.count();
  for (let i = 0; i < decisionCount; i++) {
    const toggle = decisions.nth(i).locator("button").first();
    await toggle.click(); // todo -> doing
    await toggle.click(); // doing -> done
  }
  await page.waitForTimeout(250);
  check(
    "Settling the open decisions unblocks downstream work",
    (await page.locator("text=blocked by").count()) < blockedBefore,
    `${blockedBefore} -> ${await page.locator("text=blocked by").count()}`
  );
  check(
    "Task status is recorded",
    (await page.locator('[data-status="done"]').count()) > 0
  );

  // Scaffold
  await page.getByTestId("tab-scaffold").click();
  await page.waitForSelector("text=Generated files", { timeout: 10000 });
  const fileCount = await page.locator('[data-testid^="scaffold-"]').count();
  check("Scaffold generates a starting codebase", fileCount >= 5, `${fileCount} files`);

  const buildMd = await page.locator("pre").first().innerText();
  check("BUILD.md carries the task list", buildMd.includes("## Decide"));

  await page.getByTestId("scaffold-1").click();
  await page.waitForTimeout(150);
  const typesFile = await page.locator("pre").first().innerText();
  check(
    "Generated types come from the data model",
    typesFile.includes("export interface")
  );

  // 7. Persistence
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Spec ready", { timeout: 10000 });
  check("Projects persist across navigation", true);
  check(
    "Task progress persists",
    (await page.locator("text=tasks done").count()) > 0
  );
} catch (error) {
  check("Run completed without throwing", false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`
);
process.exit(failed.length === 0 ? 0 : 1);
