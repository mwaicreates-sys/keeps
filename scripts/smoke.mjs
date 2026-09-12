// Live smoke test: drives the running app with Playwright against the real
// Supabase project. Run with the app already up at BASE_URL (default
// http://localhost:3000).
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const stamp = Date.now();
const email = `smoketest+${stamp}@example.com`;
const password = "TestPass123!";

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`PASS: ${name}`);
  } catch (e) {
    results.push(`FAIL: ${name} -- ${e.message}`);
  }
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("requestfailed", (req) => {
  errors.push(`requestfailed: ${req.url()} -- ${req.failure()?.errorText}`);
});

await step("redirect / -> /login", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForURL("**/login", { timeout: 10000 });
});

await step("sign up", async () => {
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#name", "Gerry");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button:has-text("Create account")');
  await page.waitForURL("**/space/create", { timeout: 20000 });
});

await step("create space", async () => {
  await page.fill('input[placeholder="e.g. Gerry & Cuz"]', "Gerry & Cuz Smoke Test");
  await page.click('button:has-text("Create space")');
  await page.waitForSelector("text=Your space is ready", { timeout: 20000 });
  await page.click('button:has-text("Go to Home")');
  await page.waitForURL("**/home", { timeout: 20000 });
});

await step("home renders empty state", async () => {
  await page.waitForSelector("text=Nothing here yet", { timeout: 15000 });
});

await step("create text drop", async () => {
  await page.goto(`${BASE}/drop`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Text")');
  await page.fill("textarea", "Testing the real deployment");
  await page.click('button:has-text("Drop it")');
  await page.waitForURL("**/home", { timeout: 20000 });
  await page.waitForSelector("text=Testing the real deployment", { timeout: 15000 });
});

await step("react to the drop", async () => {
  await page.click('button[aria-label="React with ❤️"]');
  await page.waitForSelector('button[aria-pressed="true"]', { timeout: 10000 });
});

for (const path of ["/memories", "/play", "/profile", "/notifications", "/search"]) {
  await step(`visit ${path}`, async () => {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (!resp || resp.status() >= 400) throw new Error(`status ${resp && resp.status()}`);
    const bodyText = (await page.textContent("body")) || "";
    if (/Application error|This page could not be found/i.test(bodyText)) {
      throw new Error(`error content detected: ${bodyText.slice(0, 200)}`);
    }
  });
}

await step("play a full This or That round solo-visible (creation only)", async () => {
  await page.goto(`${BASE}/play/this-or-that`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Suggest one")');
  await page.waitForSelector("li button", { timeout: 15000 });
});

console.log(results.join("\n"));
console.log(`\n${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
console.log("\n---CONSOLE/REQUEST ERRORS---");
console.log(errors.length ? errors.join("\n") : "(none)");

await browser.close();

if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
