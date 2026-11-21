/* Regenerates the README screenshots from a small, hand-written example profile (no pack content).
   Skipped unless SCREENSHOTS=1:   SCREENSHOTS=1 npx playwright test screenshots   */
import { test, expect } from "@playwright/test";

test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to regenerate docs/images");
test.setTimeout(120_000);

const OUT = "docs/images";
const SAMPLE = {
  Mathematics: [["Linear Algebra", ["Vector spaces and rank", "SVD and least squares", "Eigen-decomposition"], 3], ["Probability", ["Bayes' rule", "Gaussians", "Maximum likelihood"], 1], ["Optimization", ["Gradient descent", "Gauss–Newton"], 0]],
  "Machine Learning": [["Deep Learning Foundations", ["Backpropagation", "Convolutional networks", "Regularisation"], 2], ["Transformers", ["Self-attention", "Positional encoding"], 0]],
  Robotics: [["ROS 2", ["Nodes and topics", "TF frames", "Launch files"], 2]],
};

test("README screenshots", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#obName")).toBeVisible({ timeout: 8000 });
  await page.fill("#obName", "Hazem Abuelanin");
  await page.fill("#obTitle", "AI Systems Engineer");
  await page.setInputFiles("#obAvaFile", `${OUT}/avatar-example.png`);
  await page.click('[data-emb="atom"]');
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
    await page.fill("#rCode", region.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase().padEnd(2, region[1].toUpperCase())); await page.locator("#rCode").dispatchEvent("input");
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
  for (const [n, i] of [["Transformer (2017)", "Attention-only sequence model; the backbone of modern language and vision models."], ["Kalman filter", "Optimal recursive estimator for linear-Gaussian systems: predict, then correct."], ["Backpropagation", "The chain rule applied efficiently to compute gradients through a network."]]) {
    await page.fill("#afName", n); if (await page.locator("#afNew").isVisible()) await page.fill("#afNew", "Models & algorithms");
    await page.fill("#afIdea", i); await page.click("#atlForm button[type=submit]");
  }
  await page.click("#afCancel");
  await page.locator(".atl .astate").nth(1).click(); await page.locator(".atl .astate").nth(1).click(); await page.locator(".atl .astate").nth(2).click();

  await page.click('.tab[data-view="now"]');
  await page.fill("#gText", "Finish the SVD problem set"); await page.click("#goalForm button[type=submit]");
  await page.fill("#gText", "Read two papers on attention"); await page.click("#goalForm button[type=submit]");
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

  const clean = () => page.evaluate(() => document.querySelectorAll(".unlock,.levelup").forEach(e => e.remove()));

  await page.click('.tab[data-view="quests"]');
  await page.click("#addQuest");
  await page.fill("#qName", "Autodiff engine from scratch"); await page.locator("#qName").dispatchEvent("input"); await page.locator("#qName").dispatchEvent("change"); await page.waitForTimeout(300);
  await page.fill("#qDone", "Trains an MLP to 97% on MNIST using only my engine"); await page.locator("#qDone").dispatchEvent("input");
  await page.locator("#qProves select").selectOption({ label: "Deep Learning Foundations" });
  await page.locator("#qChk .chk").first().check();
  await clean(); await page.evaluate(() => (document.querySelector("#questEd").scrollTop = 0)); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/quests.png` });

  await page.click('.tab[data-view="atlas"]');
  await clean(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/atlas.png` });

  await page.click('.tab[data-view="inv"]');
  await page.click("#sysBtn");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/settings.png` });
  for (const t of ["aurora", "ember", "daylight"]) {
    await page.click(`#settings [data-theme-pick="${t}"]`);
    await page.keyboard.press("Escape"); await clean(); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/theme-${t}.png` });
    await page.click("#sysBtn"); await page.waitForTimeout(300);
  }
  await page.keyboard.press("Escape");
  await clean();
  await page.click('.tab[data-view="map"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/roadmap-daylight.png` });
});
