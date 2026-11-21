/* Regenerates the README screenshots from a small, made-up sample profile.
   Skipped unless SCREENSHOTS=1:   SCREENSHOTS=1 npx playwright test screenshots   */
import { test, expect } from "@playwright/test";

test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate docs/images");
test.setTimeout(120_000);

const OUT = "docs/images";
const SAMPLE = {
  Grammar: [["Present tense", ["Regular -ar/-er/-ir verbs", "Ser vs. estar", "Stem-changing verbs"], 3], ["Past tenses", ["Preterite", "Imperfect", "When to use which"], 1], ["Subjunctive", ["Triggers (WEIRDO)", "Present subjunctive forms"], 0]],
  Listening: [["Slow podcasts", ["Follow an episode without transcript", "Retell it in 3 sentences"], 2], ["Native-speed audio", ["Understand 70% of a news clip"], 0]],
  Speaking: [["Daily conversation", ["Introduce yourself for 2 minutes", "Ask follow-up questions", "Recover when stuck"], 2]],
};

test("README screenshots", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#obName")).toBeVisible({ timeout: 8000 });
  await page.fill("#obName", "Mira Santos");
  await page.fill("#obTitle", "Conversational in Spanish");
  await page.click('[data-emb="globe"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/character.png` });
  await page.click("#obNext");
  await page.click('[data-months="12"]');
  await page.click("#obNext");
  await page.click("#obNext");
  await page.waitForTimeout(600);

  await page.click('.tab[data-view="inv"]');
  for (const [region, skills] of Object.entries(SAMPLE)) {
    await page.click("#addRegion");
    await page.fill("#rName", region); await page.locator("#rName").dispatchEvent("input");
    await page.fill("#rCode", region.slice(0, 2).toUpperCase()); await page.locator("#rCode").dispatchEvent("input");
    for (const [name, musts, done] of skills) {
      await page.click("#addSkill");
      await page.fill("#sName", name); await page.locator("#sName").dispatchEvent("input");
      for (const m of musts) { await page.fill("#mText", m); await page.click("#addMust button[type=submit]"); }
      for (let i = 0; i < done; i++) await page.locator("#musts .chk").nth(i).check();
    }
  }
  await page.evaluate(() => document.querySelectorAll(".unlock,.levelup").forEach(e => e.remove()));
  await page.locator("#rail .ritem").first().click();
  await page.locator(".slot").nth(1).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/inventory.png` });

  await page.click('.tab[data-view="atlas"]');
  await page.click("#aAdd2");
  for (const [n, i] of [["Subjunctive mood", "Expresses wishes, doubt and emotion; triggered by certain verbs and conjunctions."], ["Comprehensible input", "You acquire language by understanding messages slightly above your level."], ["Shadowing", "Repeat audio a split-second behind the speaker to train rhythm and pronunciation."]]) {
    await page.fill("#afName", n); if (await page.locator("#afNew").isVisible()) await page.fill("#afNew", "Ideas & methods");
    await page.fill("#afIdea", i); await page.click("#atlForm button[type=submit]");
  }
  await page.click("#afCancel");
  await page.locator(".atl .astate").nth(1).click(); await page.locator(".atl .astate").nth(1).click(); await page.locator(".atl .astate").nth(2).click();

  await page.click('.tab[data-view="now"]');
  await page.fill("#gText", "Finish the preterite worksheet"); await page.click("#goalForm button[type=submit]");
  await page.fill("#gText", "Two podcast episodes"); await page.click("#goalForm button[type=submit]");
  await page.locator("summary", { hasText: "Log time by hand" }).click(); await page.fill("#lMin", "75"); await page.click("#logForm button[type=submit]");
  await page.evaluate(() => document.querySelectorAll(".unlock,.levelup").forEach(e => e.remove()));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/now.png` });

  await page.click('.tab[data-view="bio"]');
  await page.click('[data-ban="dusk"]');
  await page.evaluate(() => document.querySelectorAll(".unlock,.levelup").forEach(e => e.remove()));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/profile.png` });

  await page.click('.tab[data-view="inv"]');
  await page.locator(".slot").nth(1).click();
  await page.locator("#musts .chk").nth(1).check();
  await page.locator("#musts .chk").nth(2).check();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/unlock.png` });

  await page.click("#sysBtn");
  await page.click('#settings [data-theme-pick="daylight"]');
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelectorAll(".unlock,.levelup").forEach(e => e.remove()));
  await page.click('.tab[data-view="map"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/roadmap-daylight.png` });
});
