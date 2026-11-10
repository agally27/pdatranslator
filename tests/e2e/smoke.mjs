/**
 * End-to-end smoke test (demo mode) using Playwright.
 *
 *   npm run build && npm run start -- -p 3100 &
 *   BASE_URL=http://localhost:3100 npm run test:e2e
 *
 * Walks through every main page and core flow, checks each page at the five
 * target widths for horizontal overflow, and fails on any browser console error.
 * Optional: SCREENSHOT_DIR=/some/dir saves a screenshot per page and width.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SCREENSHOT_DIR;
const WIDTHS = [375, 390, 768, 1280, 1440];
const PAGES = ["/dashboard", "/translator", "/specialist", "/profiles", "/history", "/knowledge", "/knowledge/declarative-language", "/settings", "/privacy"];

const failures = [];
let passed = 0;
const check = (name, ok, detail = "") => {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` – ${detail}` : ""}`);
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` – ${detail}` : ""}`);
};

const browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone", "clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

try {
  // ── Landing, auth guard and demo login ────────────────────────────────────
  await page.goto(BASE);
  check("landing page shows the brand and tagline", (await page.getByText("Communication. Understanding. Connection.").count()) > 0);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL("**/login");
  check("signed-out visitors are sent to /login", true);
  await page.getByRole("button", { name: "Continue in demo mode" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }).waitFor();
  check("demo login reaches the dashboard", true);
  check("dashboard shows seeded recent translations", (await page.getByText("Put your shoes on now").count()) > 0);
  check("demo mode is clearly labelled", (await page.getByText(/Demo mode – your information is stored only in this browser/).count()) > 0);

  // ── Navigation ────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const label of ["PDA Translator", "PDA Specialist", "My Child Profiles", "Translation History", "PDA Knowledge Hub", "Settings", "Dashboard"]) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();
    await page.locator("h1").first().waitFor();
  }
  check("all seven sidebar destinations load", true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "More pages" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "PDA Knowledge Hub" }).click();
  await page.waitForURL("**/knowledge");
  check("mobile tab bar and More sheet navigate", true);

  // ── Translator: text input ────────────────────────────────────────────────
  await page.goto(`${BASE}/translator`);
  await page.getByLabel("What do you want to say?").fill("You need to brush your teeth right now!");
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await page.getByRole("heading", { name: "Your alternatives" }).waitFor();
  check("translation returns six alternative cards", (await page.getByRole("article").count()) === 6);
  check("demand analysis is shown", (await page.getByText("High potential demand").count()) > 0);
  check("results are labelled as demo responses", (await page.getByText("Demo response").count()) > 0);
  for (const style of ["Descriptive", "Collaborative", "Autonomy-supporting", "Playful", "Reassuring", "Minimal language"]) {
    check(`style card present: ${style}`, (await page.getByRole("article", { name: `${style} alternative` }).count()) === 1);
  }

  const card = page.getByRole("article", { name: "Reassuring alternative" });
  await card.getByRole("button", { name: "Copy" }).click();
  await card.getByRole("button", { name: "Copied" }).waitFor();
  check("copy works", (await page.evaluate(() => navigator.clipboard.readText())).length > 10);
  await card.getByRole("button", { name: "Save", exact: true }).click();
  await card.getByRole("button", { name: "Saved" }).waitFor();
  check("save works", true);
  await card.getByRole("button", { name: "Feedback" }).click();
  await page.getByRole("menuitem", { name: "This worked" }).click();
  await card.getByRole("button", { name: "This worked" }).waitFor();
  check("feedback is recorded", true);
  const before = await card.locator("p.font-display").innerText();
  await card.getByRole("button", { name: "Adjust" }).click();
  await page.getByRole("menuitem", { name: "Make it shorter" }).click();
  await page.waitForFunction((b) => document.querySelector('[aria-label="Reassuring alternative"] p.font-display')?.textContent !== b, before);
  check("“Make it shorter” shortens the alternative", (await card.locator("p.font-display").innerText()).length < before.length);
  await card.getByRole("button", { name: "Adjust" }).click();
  await page.getByRole("menuitem", { name: "Generate another alternative" }).click();
  await page.waitForFunction(() => document.querySelectorAll("article").length === 7);
  check("“Generate another alternative” adds a card", true);
  await page.getByRole("button", { name: "Try again" }).first().click();
  await page.waitForFunction(() => document.querySelectorAll("article").length === 6);
  check("“Try again” regenerates", true);

  // ── Translator: situation + voice ─────────────────────────────────────────
  await page.getByRole("tab", { name: "Situation" }).click();
  await page.getByLabel("What’s happening?").fill("My child is refusing to get dressed. We need to leave for an appointment and they are becoming distressed.");
  await page.getByLabel(/What would you normally say/).fill("");
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await page.getByText("Understanding what you want").waitFor({ state: "detached" }).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("article").length === 6);
  check("situation input produces alternatives", true);

  await page.getByRole("tab", { name: "Voice" }).click();
  check("voice tab shows a record control", (await page.getByRole("button", { name: "Start recording" }).count()) === 1);

  // ── Personalisation consent ───────────────────────────────────────────────
  await page.getByRole("tab", { name: "Text" }).click();
  await page.getByRole("button", { name: "Turn on" }).click();
  check("consent dialog discloses that the name is never sent", (await page.getByText(/your child’s name/).count()) > 0);
  await page.getByRole("button", { name: "Yes, personalise" }).click();
  await page.getByText(/Personalised for/).waitFor();
  await page.getByLabel("What do you want to say?").fill("Put your shoes on now.");
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await page.getByText("Personalised using").waitFor();
  check("personalised translation uses the profile’s interests", (await page.getByRole("article", { name: "Playful alternative" }).innerText()).includes("dinosaurs"));

  // ── History ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/history`);
  await page.getByLabel("Search").fill("teeth");
  check("history search filters results", (await page.getByText(/of \d+ shown/).innerText()).startsWith("3 of") || (await page.getByText(/of \d+ shown/).innerText()).startsWith("2 of"), await page.getByText(/of \d+ shown/).innerText());
  await page.getByRole("tab", { name: /Favourites/ }).click();
  check("favourites tab lists saved alternatives", (await page.getByRole("button", { name: "Remove" }).count()) >= 3);
  await page.getByRole("link", { name: "Reopen" }).first().click();
  await page.getByRole("heading", { name: "Your alternatives" }).waitFor();
  check("reopening a past translation restores its results", (await page.getByRole("article").count()) >= 6);

  // ── Specialist ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/specialist`);
  await page.getByRole("button", { name: "What can I try when my child is overwhelmed?" }).click();
  await page.getByRole("link", { name: /Overwhelm and meltdowns/ }).waitFor();
  check("specialist replies with a knowledge-base source", true);
  await page.getByLabel("Message the PDA Specialist").fill("Why might this language feel demanding?");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText(/Declarative language —/).waitFor();
  check("follow-up messages work", (await page.getByRole("log").locator("ol > li").count()) === 4);
  await page.reload();
  await page.getByRole("button", { name: "Show conversations" }).click();
  check("conversations persist after reload", (await page.getByRole("dialog").getByText("When your child is overwhelmed").count()) === 1);
  await page.getByRole("dialog").getByRole("button", { name: "Options for When your child is overwhelmed" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Title").fill("Hard afternoons");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Show conversations" }).click();
  check("conversation can be renamed", (await page.getByRole("dialog").getByText("Hard afternoons").count()) === 1);
  await page.getByRole("dialog").getByRole("button", { name: "Options for Hard afternoons" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByText("Conversation deleted.").waitFor();
  check("conversation can be deleted", true);

  // ── Profiles ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/profiles`);
  await page.getByRole("button", { name: "Add profile" }).click();
  await page.getByLabel("Preferred name").fill("Robin");
  await page.getByLabel("Interests").fill("space");
  await page.getByRole("button", { name: "Create profile" }).click();
  await page.getByRole("heading", { name: "Robin" }).waitFor();
  check("profile can be created", true);
  await page.getByRole("button", { name: "Edit Robin" }).click();
  await page.getByLabel("Age or age range").fill("9");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Age 9").waitFor();
  check("profile can be edited", true);
  check("three preference categories are shown", (await page.getByText("Confirmed by you").count()) > 0 && (await page.getByText("Noticed in your feedback").count()) > 0 && (await page.getByText("Suggestions to consider").count()) > 0);
  await page.getByRole("button", { name: "Confirm" }).first().click();
  await page.getByText(/Confirmed\. This will now be used/).waitFor();
  check("an observation can be confirmed by the parent", true);
  await page.getByRole("button", { name: "Delete Robin" }).click();
  await page.getByRole("button", { name: "Delete profile" }).click();
  await page.getByRole("heading", { name: "Robin" }).waitFor({ state: "detached" });
  check("profile can be deleted", true);

  // ── Knowledge hub ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/knowledge`);
  await page.getByLabel("Search the Knowledge Hub").fill("school");
  await page.getByRole("link", { name: /Working with school/ }).click();
  await page.getByRole("heading", { name: "Sources" }).waitFor();
  check("article shows evidence label, review date and sources", (await page.getByText("Organisation guidance").count()) > 0 && (await page.getByText(/Reviewed \d+ \w+ \d{4}/).count()) > 0 && (await page.getByText("IPSEA").count()) > 0);

  // ── Settings ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/settings`);
  await page.getByText("AI model").waitFor();
  check("settings explains which services are connected", (await page.locator("li", { hasText: "not configured" }).count()) === 3);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  check("data export downloads a JSON file", (await download).suggestedFilename().endsWith(".json"));
  await page.getByRole("switch", { name: /Keep my translation history/ }).click();
  await page.getByText("Saved.").first().waitFor();
  check("settings toggles save", true);

  // ── Responsive: no horizontal overflow at any target width ───────────────
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`);
      await page.locator("h1").first().waitFor();
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`no horizontal overflow at ${width}px on ${path}`, overflow <= 1, `${overflow}px`);
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: `${SHOTS}/${width}${path.replace(/\//g, "_")}.png`, fullPage: true });
      }
    }
  }

  // ── Delete everything ─────────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/settings`);
  await page.getByRole("button", { name: "Delete demo data" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.waitForURL(`${BASE}/`);
  check("deleting all data clears browser storage and signs out", (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("pda-companion")).length)) === 0);

  check("no browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (err) {
  failures.push(`Unexpected failure: ${err instanceof Error ? err.message.split("\n").slice(0, 4).join(" ⏎ ") : err}`);
  if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/failure.png`, fullPage: true }).catch(() => {}); }
} finally {
  await browser.close();
}

console.log(`\n${passed} checks passed, ${failures.length} failed`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
