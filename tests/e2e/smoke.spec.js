import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { demoPack } from "../fixtures/load.js";

/** The synthetic fixture pack as an importable file. */
const PACK_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pa-e2e-")), "demo-pack.json");
fs.writeFileSync(PACK_FILE, JSON.stringify(demoPack()));

/** Fail on any uncaught error or console error. */
function watch(page) {
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  return errors;
}
const TABS = ["now", "inv", "quests", "map", "atlas", "blog", "duties", "bio"];
async function visitAllTabs(page) {
  for (const v of TABS) {
    const tab = page.locator(`.tab[data-view="${v}"]`);
    if (await tab.isHidden()) continue;
    await tab.click();
    await expect(page.locator(`#v-${v}`)).toBeVisible();
  }
}
/** Walk through character creation. */
async function create(page, o = {}) {
  await expect(page.locator("#obName")).toBeVisible({ timeout: 8000 });
  if (o.packFile) {
    const [ch] = await Promise.all([page.waitForEvent("filechooser"), page.click("#obPackImport")]);
    await ch.setFiles(o.packFile);
    await page.click("#obBack");
  }
  if (o.name) await page.fill("#obName", o.name);
  if (o.emblem) await page.click(`[data-emb="${o.emblem}"]`);
  await page.click("#obNext");
  if (o.months) await page.fill("#obMonths", String(o.months));
  if (o.vocab) await page.locator(`#obVocab [data-v="${o.vocab}"]`).click();
  await page.click("#obNext");
  if (o.theme) await page.click(`[data-theme-pick="${o.theme}"]`);
  if (o.game === false) await page.uncheck("#obGame");
  await page.click("#obNext");
  await expect(page.locator("#onboard")).toBeHidden();
}

test("first run: splash, character creation, an empty atlas and every tab", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(page.locator("#splash")).toBeVisible();
  await create(page, { name: "Sam Rivera", emblem: "atom" });
  await expect(page.locator("#hudName")).toContainText("Sam Rivera");
  await expect(page.locator("#hudRank")).toHaveText("Novice · LV 1");
  await expect(page.locator(".starter")).toContainText("Starter quests · 1/8");
  await page.click('.tab[data-view="inv"]');
  await expect(page.locator("#center .empty h3")).toHaveText("Your map is empty");
  await visitAllTabs(page);
  await page.reload();
  await expect(page.locator("#splash .sp-title")).toHaveText("Sam Rivera");
  expect(errors).toEqual([]);
});

test("game moments: unlocks, mastery and level-up", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await create(page, { name: "Kai" });
  await page.click('.tab[data-view="inv"]');
  await page.click("#emptyAdd");
  await expect(page.locator(".unlock", { hasText: "Cartographer" })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.click("#addSkill");
    await page.fill("#mText", `Concept ${i}`);
    await page.click("#addMust button[type=submit]");
    await page.locator("#musts .chk").first().check();
  }
  await expect(page.locator(".levelup")).toBeVisible();
  await expect(page.locator(".unlock", { hasText: "Mastered" }).first()).toBeVisible();
  await expect(page.locator("#hudRank")).toContainText("Apprentice");
  await page.click(".levelup").catch(() => {});
  await page.click('.tab[data-view="bio"]');
  await expect(page.locator(".trophy.got", { hasText: "Conqueror" })).toBeVisible();
  // celebrated moments are remembered: a reload doesn't replay them
  await page.reload();
  await page.waitForTimeout(1800);
  await expect(page.locator(".unlock")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a pack file, vocabulary, hidden tabs, game layer off and an odd plan length", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await create(page, { packFile: PACK_FILE, vocab: "academic", months: 10, game: false, theme: "daylight" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await expect(page.locator('.tab[data-view="inv"]')).toHaveText("Subjects");
  await page.click('.tab[data-view="inv"]');
  await expect(page.locator("#rail .ritem")).toHaveCount(2);
  await page.click('.tab[data-view="map"]');
  await expect(page.locator("#mapTitle")).toHaveText("Timeline · 10 months");
  await expect(page.locator(".mlab")).toHaveCount(10);
  await expect(page.locator("#lvl")).toBeHidden();

  await page.click("#sysBtn");
  await page.locator('#vocabSeg [data-v="game"]').click();
  await expect(page.locator('.tab[data-view="quests"]')).toContainText("Missions"); // the pack's own wording
  await page.locator('[data-tab="duties"]').uncheck();
  await expect(page.locator('.tab[data-view="duties"]')).toBeHidden();
  await page.locator('#gameSeg [data-g="1"]').click();
  await expect(page.locator("#lvl")).toBeVisible();
  await page.fill("#setMonths", "24");
  await page.locator("#setMonths").dispatchEvent("change");
  await expect(page.locator("#mapTitle")).toHaveText("Roadmap · 24 months");
  await page.click('#settings [data-theme-pick="ember"]');
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ember");
  await page.keyboard.press("Escape");
  await visitAllTabs(page);
  expect(errors).toEqual([]);
});

test("atlas entries can be added, marked, edited and deleted", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await create(page);
  await page.click('.tab[data-view="atlas"]');
  await page.click("#aAdd2");
  await page.fill("#afName", "Spaced repetition");
  await page.fill("#afNew", "Learning techniques");
  await page.fill("#afIdea", "Review just before you would forget.");
  await page.click("#atlForm button[type=submit]");
  await page.fill("#afName", "Retrieval practice");
  await page.click("#atlForm button[type=submit]");
  await page.click("#afCancel");
  await expect(page.locator(".atl")).toHaveCount(2);
  await page.locator(".atl .astate").first().click();
  await expect(page.locator("#nAtlas")).toHaveText("1/2");
  await page.click("#aEdit");
  await page.locator(".atl [data-del]").last().click();
  await page.locator(".atl [data-del]").last().click();
  await expect(page.locator(".atl")).toHaveCount(1);
  await page.reload();
  await page.click('.tab[data-view="atlas"]');
  await expect(page.locator(".atl")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("a backup restores into a fresh browser, even without the pack file", async ({ page, browser }) => {
  const errors = watch(page);
  await page.goto("/");
  await create(page, { name: "Robin", packFile: PACK_FILE });
  await page.click('.tab[data-view="inv"]');
  await page.locator(".slot").first().click();
  await page.locator("#musts .chk").first().check();
  await page.click("#sysBtn");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#setExport")]);
  const file = await dl.path();
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(saved.app).toBe("PersoAtlas");
  expect(saved.pack.id).toBe("demo-pack");

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  const errors2 = watch(p2);
  await p2.goto("/");
  await expect(p2.locator("#obName")).toBeVisible({ timeout: 8000 });
  const [chooser] = await Promise.all([p2.waitForEvent("filechooser"), p2.click("#obRestore")]);
  await chooser.setFiles(file);
  await expect(p2.locator("#hudName")).toContainText("Robin");
  await p2.click('.tab[data-view="inv"]');
  await expect(p2.locator("#rail .ritem")).toHaveCount(2);
  await expect(p2.locator("#sSrc")).toContainText("1/");
  await expect(p2.locator('.tab[data-view="quests"]')).toContainText("Missions");
  await ctx.close();
  expect([...errors, ...errors2]).toEqual([]);
});
