import { describe, it, expect } from "vitest";
import { TROPHIES, longestStreak, tally, trophyProgress, unlockKeys } from "../../src/core/achievements.js";
import { fresh } from "../../src/core/model.js";
import { demoPack } from "../fixtures/load.js";

const DEMO = demoPack();
const skills = o => Object.values(o.regions).flatMap(r => r.skills);

describe("achievements", () => {
  it("a fresh profile has earned nothing", () => {
    const o = fresh(DEMO);
    const t = tally(o);
    expect(t.started + t.mastered + t.quests + t.sessions).toBe(0);
    // creating regions/skills from a pack counts as having a map, so only those two trophies are earned
    expect([...unlockKeys(o, 1).keys()].sort()).toEqual(["t:cartographer", "t:first-step"]);
  });
  it("mastering every skill of a region unlocks the skill, region and trophy moments", () => {
    const o = fresh(DEMO);
    o.regions.beta.skills.forEach(s => { s.status = "mastered"; s.progress = 100; });
    const keys = unlockKeys(o, 1);
    expect(keys.has("m:beta-one")).toBe(true);
    expect(keys.has("r:beta")).toBe(true);
    expect(keys.has("t:adept")).toBe(true);
    expect(keys.has("t:conqueror")).toBe(true);
    expect(keys.has("r:alpha")).toBe(false);
  });
  it("quests, streaks, focus hours and levels count", () => {
    const o = fresh(DEMO);
    o.quests[0].status = "done";
    o.sessions = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05"].map((d, i) => ({ id: "t" + i, date: d, min: 200, ref: "" }));
    const keys = unlockKeys(o, 5);
    ["q:demo-mission", "t:quest-1", "t:warming-up", "t:zone", "t:dedicated", "t:level-5"].forEach(k => expect(keys.has(k)).toBe(true));
    expect(keys.has("t:on-fire")).toBe(false);
  });
  it("longestStreak finds the longest run of consecutive days", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak([{ date: "2026-03-01" }, { date: "2026-03-02" }, { date: "2026-03-02" }, { date: "2026-03-04" }])).toBe(2);
    expect(longestStreak(["2026-02-27", "2026-02-28", "2026-03-01"].map(date => ({ date })))).toBe(3);
  });
  it("progress never exceeds the goal and every trophy has an icon", () => {
    const o = fresh(DEMO); skills(o).forEach(s => (s.status = "mastered"));
    trophyProgress(o, 1).forEach(t => { expect(t.cur).toBeLessThanOrEqual(t.goal); expect(t.icon).toBeTruthy(); });
    expect(new Set(TROPHIES.map(t => t.id)).size).toBe(TROPHIES.length);
  });
});
