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

  // 6. Build — the split view
  await page.getByTestId("go-to-build").click();
  await page.waitForURL(/\/build$/, { timeout: 10000 });
  await page.waitForSelector('[data-testid="preview-surface"]', { timeout: 15000 });
  check("Build opens as a split view with a live preview", true);

  const taskCount = await page.locator("[data-task]").count();
  check("Spec compiles into a task list", taskCount > 12, `${taskCount} tasks`);
  check(
    "Tasks are grouped into milestones",
    (await page.locator("[data-milestone]").count()) >= 4
  );

  // Plain language leads; the reviews' own words are behind a toggle.
  const firstTask = page.locator("[data-task]").first();
  check(
    "Tasks lead with plain language",
    (await firstTask.locator("p.font-medium").first().innerText()).length > 0
  );
  check(
    "The technical detail is available but not first",
    (await page.locator("text=Show the technical detail").count()) > 0
  );

  // No two tasks should carry the same plain heading.
  const headings = await page.locator("[data-task] [data-task-title]").allInnerTexts();
  check(
    "No two tasks say the same thing",
    new Set(headings).size === headings.length,
    `${headings.length} tasks, ${new Set(headings).size} distinct`
  );

  check(
    "Downstream work is blocked by open decisions",
    (await page.locator("text=waiting on").count()) > 0
  );

  // Loom asks rather than lists — and remembers what you say.
  check(
    "Loom says what it still needs to know",
    (await page.getByTestId("open-questions").count()) > 0
  );
  const identity = page.locator('[data-question="fix-identity"]').first();
  check(
    "Decisions are asked as real questions",
    (await identity.count()) > 0 &&
      /who owns/i.test(await identity.innerText())
  );
  check(
    "Suggested answers say what they cost",
    (await identity.locator("[data-answer]").count()) >= 2
  );

  await identity.locator("[data-answer]").first().click();
  await page.waitForTimeout(400);
  const answered = page.locator('[data-task="fix-identity"]').first();
  check(
    "Answering records what you said",
    /you said/i.test(await answered.innerText())
  );
  check(
    "Answering settles the task",
    (await answered.getAttribute("data-status")) === "done"
  );


  // 7. Editing the app — the anti-drift guarantee
  await page.getByTestId("tab-screens").click();
  await page.waitForSelector('[data-testid="add-screen"]', { timeout: 10000 });

  await page.getByTestId("entity-shoot").click();
  await page.waitForTimeout(200);
  await page.getByTestId("field-shoot-title").fill("sessionTitle");
  await page.waitForTimeout(400);

  // The create screen labels every field, so a rename is visible there.
  await page.getByTestId("preview-screen").selectOption("shoots-create");
  await page.waitForTimeout(300);
  const previewText = await page.getByTestId("preview-surface").innerText();
  check(
    "Renaming a field changes the preview",
    /session title/i.test(previewText),
    previewText.slice(0, 60).replace(/\n/g, " ")
  );

  await page.getByTestId("tab-scaffold").click();
  await page.waitForTimeout(300);
  const typesButton = page.locator('[data-testid^="scaffold-"]', {
    hasText: "lib/types.ts",
  });
  await typesButton.click();
  await page.waitForTimeout(300);
  const typesSource = await page.locator("pre").first().innerText();
  check(
    "Renaming a field changes the generated code too",
    typesSource.includes("sessionTitle")
  );

  // Adding a screen reaches the plan and the code.
  const filesBefore = await page.locator('[data-testid^="scaffold-"]').count();
  await page.getByTestId("tab-screens").click();
  await page.getByTestId("add-screen").click();
  await page.waitForTimeout(400);
  await page.getByTestId("tab-scaffold").click();
  await page.waitForTimeout(300);
  const filesAfter = await page.locator('[data-testid^="scaffold-"]').count();
  check(
    "Adding a screen adds its file to the code",
    filesAfter === filesBefore + 1,
    `${filesBefore} -> ${filesAfter}`
  );
  await page.getByTestId("tab-tasks").click();
  await page.waitForTimeout(300);
  check(
    "Adding a screen adds its task",
    (await page.locator("[data-task]").count()) === taskCount + 1
  );

  // 8. Theme
  await page.getByTestId("tab-theme").click();
  await page.waitForSelector('[data-testid="preset-forest"]', { timeout: 10000 });
  const primaryBefore = await page.evaluate(() =>
    getComputedStyle(
      document.querySelector('[data-testid="preview-surface"]')
    ).getPropertyValue("--primary")
  );
  await page.getByTestId("preset-forest").click();
  await page.waitForTimeout(400);
  const primaryAfter = await page.evaluate(() =>
    getComputedStyle(
      document.querySelector('[data-testid="preview-surface"]')
    ).getPropertyValue("--primary")
  );
  check(
    "Changing the theme restyles the preview",
    primaryBefore !== primaryAfter,
    `${primaryBefore.trim()} -> ${primaryAfter.trim()}`
  );
  check(
    "The theme is checked for readability",
    (await page.locator('[data-testid="contrast-checks"] li').count()) >= 4
  );

  // 9. The human-in-the-loop checkpoint
  await page.getByTestId("tab-tasks").click();
  await page.waitForTimeout(300);
  // Advance each to done, whatever state it is already in.
  for (const id of ["fix-identity", "fix-permissions", "screen-auth"]) {
    const row = page.locator(`[data-task="${id}"]`).first();
    if ((await row.count()) === 0) continue;
    for (let i = 0; i < 3; i++) {
      if ((await row.getAttribute("data-status")) === "done") break;
      await row.locator("button").first().click();
      await page.waitForTimeout(150);
    }
  }
  await page.waitForTimeout(400);

  await page.waitForSelector("[data-checkpoint]", { timeout: 10000 });
  check("Finishing a feature raises a checkpoint", true);

  await page.getByTestId("designer-name").first().fill("Scott");
  await page.getByTestId("designer-name").first().blur();
  await page.waitForTimeout(400);
  const headline = await page
    .getByTestId("checkpoint-headline")
    .first()
    .innerText();
  check(
    "The checkpoint is addressed to you, by name, in plain words",
    headline.startsWith("Scott") && /just finished/.test(headline),
    headline
  );
  check(
    "A review task is assigned to you",
    (await page.locator('[data-task^="review-"]').count()) > 0
  );

  // "Needs work" turns your own words into a task.
  await page.getByTestId("request-changes").first().click();
  const complaint = "It asks for a password before showing me anything useful.";
  await page.getByTestId("feedback-note").fill(complaint);
  await page.getByTestId("submit-feedback").click();
  await page.waitForTimeout(500);
  check(
    "Your feedback becomes a task",
    (await page.locator('[data-task^="feedback-"]').count()) > 0
  );
  await page
    .locator('[data-task^="feedback-"]')
    .first()
    .locator("text=Show the technical detail")
    .click();
  await page.waitForTimeout(200);
  check(
    "The task quotes what you actually said",
    (await page.locator(`text=${complaint}`).count()) > 0
  );

  // 10. Docs
  await page.getByTestId("tab-docs").click();
  await page.waitForTimeout(400);
  const docsText = await page.locator("main").innerText();
  check(
    "A plain-language handbook is generated",
    docsText.includes("What we're building")
  );
  await page.getByTestId("doc-4").click();
  await page.waitForTimeout(300);
  check(
    "The handbook records what you decided, in your words",
    /you said/i.test(await page.locator("main").innerText())
  );
  await page.getByTestId("doc-7").click();
  await page.waitForTimeout(300);
  check(
    "The handbook defines its own jargon",
    (await page.locator("text=Glossary").count()) > 0
  );

  // 11. The brain — shared memory for the agents that build this
  const projectId = page.url().match(/\/p\/([^/]+)\//)?.[1];
  await page.getByTestId("tab-brain").click();
  await page.waitForSelector("[data-decision]", { timeout: 15000 });
  const recorded = await page.locator("[data-decision]").count();
  check(
    "The app's genetics are on the record",
    recorded > 8,
    `${recorded} decisions`
  );
  check(
    "What you answered is in there",
    (await page.locator('[data-decision^="decided."]').count()) > 0
  );

  // Approve an agent, scoped to visual design only.
  await page.getByTestId("agent-name").fill("Visual design agent");
  await page.locator('[data-scope="ux"]').click(); // off
  await page.locator('[data-scope="visual"]').click(); // on
  await page.getByTestId("approve-agent").click();
  await page.waitForSelector("[data-agent]", { timeout: 10000 });
  check("An agent can be approved with limited scope", true);

  const agentToken = await page.getByTestId("agent-token").first().innerText();
  check("The agent gets its own key", agentToken.startsWith("loom_"));

  // Act as that agent, against the real API.
  const outOfScope = await page.request.post(
    `${BASE}/api/brain/${projectId}/decisions`,
    {
      headers: { Authorization: `Bearer ${agentToken}` },
      data: {
        subject: "shoot.ownership",
        area: "data",
        statement: "Teams own shoots.",
        why: "Easier for studios.",
      },
    }
  );
  check(
    "An agent can't write outside what it was approved for",
    outOfScope.status() === 403,
    `HTTP ${outOfScope.status()}`
  );

  const clash = await page.request.post(
    `${BASE}/api/brain/${projectId}/decisions`,
    {
      headers: { Authorization: `Bearer ${agentToken}` },
      data: {
        subject: "visual.corners",
        area: "visual",
        statement: "Square corners",
        why: "Feels more professional.",
      },
    }
  );
  check(
    "Contradicting a settled decision is refused, not silently applied",
    clash.status() === 409,
    `HTTP ${clash.status()}`
  );

  const noReason = await page.request.post(
    `${BASE}/api/brain/${projectId}/decisions`,
    {
      headers: { Authorization: `Bearer ${agentToken}` },
      data: {
        subject: "visual.motion",
        area: "visual",
        statement: "No animation.",
        why: "",
      },
    }
  );
  check(
    "An agent must say why",
    noReason.status() === 400,
    `HTTP ${noReason.status()}`
  );

  await page.getByTestId("brain-sync").click();
  await page.waitForSelector("[data-standoff]", { timeout: 10000 });
  check("The disagreement comes to you", true);
  await page.locator("[data-standoff] button").first().click();
  await page.waitForTimeout(600);
  check(
    "You can settle it, and your decision stands",
    (await page.locator("[data-standoff]").count()) === 0
  );

  // Putting a real Claude session to work costs money and takes ~30s, so it's
  // off by default. SMOKE_AGENTS=1 to include it.
  if (process.env.SMOKE_AGENTS === "1") {
    await page.getByTestId(`job-${await page.locator("[data-agent]").first().getAttribute("data-agent")}`).fill(
      "Decide the spacing scale and log it. Check what's already been decided first."
    );
    const agentId = await page.locator("[data-agent]").first().getAttribute("data-agent");
    await page.getByTestId(`run-${agentId}`).click();
    await page.waitForSelector('[data-testid="agent-log"]', { timeout: 15000 });
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="agent-log"]')
          ?.textContent?.includes("finished"),
      { timeout: 240000 }
    );
    const runLog = await page.getByTestId("agent-log").innerText();
    check("A real Claude session reads the brain before deciding", /looked up|read the brain/i.test(runLog));
    check("It logs what it decided back to the brain", /logged /i.test(runLog));
  }

  // 12. Persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-checkpoint]", { timeout: 15000 });
  check("Checkpoint state survives a reload", true);
  await page.getByTestId("tab-screens").click();
  await page.getByTestId("entity-shoot").click();
  await page.waitForTimeout(300);
  check(
    "Your edits survive a reload",
    (await page.getByTestId("field-shoot-title").inputValue()) === "sessionTitle"
  );

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Spec ready", { timeout: 10000 });
  check("Projects persist across navigation", true);

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
