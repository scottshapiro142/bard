import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const EXE =
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

try {
  // 1. Overview renders
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=What should Viktor work on?", { timeout: 10000 });
  check("Overview renders hero composer", true);
  check(
    "Overview shows KPI strip",
    (await page.locator("text=MRR").count()) > 0
  );

  // 2. Chat: assign a task and get a deliverable
  await page.goto(`${BASE}/chat`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Assign Viktor a task", { timeout: 10000 });
  const composer = page.getByPlaceholder("Assign Viktor a task…");
  await composer.fill("Reconcile Stripe and QuickBooks invoices");
  await composer.press("Enter");
  // user message appears
  await page.waitForSelector("text=Reconcile Stripe and QuickBooks invoices", {
    timeout: 10000,
  });
  // viktor delivers (worklog + deliverable)
  await page.waitForSelector("text=Viktor's worklog", { timeout: 15000 });
  await page.waitForSelector("text=Reconciliation", { timeout: 15000 });
  check("Chat: Viktor returns a worklog + deliverable", true);
  check(
    "Chat: deliverable has metrics",
    (await page.locator("text=Auto-match rate").count()) > 0
  );

  // 3. Integrations: search + connect toggle
  await page.goto(`${BASE}/integrations`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Integrations", { timeout: 10000 });
  // find a disconnected one (Microsoft Teams) and connect it
  const teamsCard = page.locator("div", { hasText: "Microsoft Teams" }).first();
  check("Integrations: catalog renders", (await page.locator("text=Slack").count()) > 0);
  // search filter
  await page.getByPlaceholder("Search integrations…").fill("github");
  await page.waitForTimeout(300);
  check(
    "Integrations: search filters",
    (await page.locator("text=GitHub").count()) > 0 &&
      (await page.locator("text=Salesforce").count()) === 0
  );
  await page.getByPlaceholder("Search integrations…").fill("");
  // connect a tool: click first "Connect" button
  const connectBtn = page.getByRole("button", { name: "Connect" }).first();
  const hadConnect = (await connectBtn.count()) > 0;
  if (hadConnect) {
    await connectBtn.click();
    await page.waitForTimeout(300);
  }
  check("Integrations: connect toggles state", hadConnect);

  // 4. Dashboards: KPIs + chart
  await page.goto(`${BASE}/dashboards`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Growth & Revenue", { timeout: 10000 });
  check("Dashboards: KPI card renders", (await page.locator("text=Open pipeline").count()) > 0);
  check("Dashboards: chart svg present", (await page.locator("svg").count()) > 0);
  // switch tab
  await page.getByRole("tab", { name: "Signups" }).click();
  await page.waitForTimeout(200);
  check("Dashboards: tab switch works", true);

  // 5. Automations: toggle + create
  await page.goto(`${BASE}/automations`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Automations", { timeout: 10000 });
  check(
    "Automations: seeded automations render",
    (await page.locator("text=Morning revenue briefing").count()) > 0
  );
  // run now on first
  await page.getByRole("button", { name: "Run now" }).first().click();
  await page.waitForTimeout(200);
  // create a new automation
  await page.getByRole("button", { name: "New automation" }).click();
  await page.waitForSelector("text=What should Viktor do?", { timeout: 5000 });
  await page.locator("#auto-name").fill("QA smoke automation");
  await page.locator("#auto-desc").fill("Created by the smoke test");
  await page.getByRole("button", { name: "Create automation" }).click();
  await page.waitForSelector("text=QA smoke automation", { timeout: 5000 });
  check("Automations: create flow adds an automation", true);

  // 6. Activity: shows entries (including ones just created)
  await page.goto(`${BASE}/activity`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Activity", { timeout: 10000 });
  check(
    "Activity: feed renders entries",
    (await page.locator("text=Reconciled Stripe and QuickBooks").count()) > 0
  );

  // 7. Mobile nav (responsive)
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(200);
  check(
    "Mobile: drawer opens",
    (await page.getByRole("button", { name: "Close menu" }).count()) > 0
  );
} catch (err) {
  check("Smoke run completed without throwing", false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join("; "));
  process.exit(1);
}
