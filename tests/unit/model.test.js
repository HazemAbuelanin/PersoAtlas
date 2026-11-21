import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { fresh, normalize, migrate, upgradeContent, mergeList, detectPack, rescale, scaleWin, defaultPhases, isContentId, clone } from "../../src/core/model.js";
import { demoPack } from "../fixtures/load.js";

const BUILT_IN = JSON.parse(fs.readFileSync(new URL("../../src/generated/packs.json", import.meta.url), "utf8"));
const DEMO = demoPack();
const allSkills = o => Object.values(o.regions).flatMap(r => r.skills);
const tiny = (over = {}) => ({
  format: 1, id: "tiny", name: "Tiny", version: "1.0.0", revision: 1,
  plan: { months: 12, phases: [{ name: "A", start: 1, end: 6 }, { name: "B", start: 7, end: 12 }] },
  regions: { aa: { name: "Area", skills: [
    { id: "aa-one", name: "One", tier: "core", start: 1, end: 3, musts: [{ id: "aa-one-m1", text: "Know the basics" }], sources: [{ id: "aa-one-s1", type: "book", title: "Book" }] },
    { id: "aa-two", name: "Two", tier: "core", start: 7, end: 12, prereqs: ["aa-one"] },
  ] } },
  quests: [{ id: "qq-first", code: "Q01", name: "First", start: 2, end: 4, proves: ["aa-one"], checklist: [{ id: "qq-first-c1", text: "Ship it" }] }],
  atlas: { cats: [{ id: "ideas", label: "Ideas" }], items: [{ id: "a-idea", cat: "ideas", name: "Idea" }] },
  ...over,
});

describe("the published app ships no content", () => {
  it("bundles only the empty Blank map", () => {
    expect(BUILT_IN.map(p => p.id)).toEqual(["blank"]);
    expect(Object.keys(BUILT_IN[0].regions)).toEqual([]);
    expect(BUILT_IN[0].quests).toEqual([]);
    expect(BUILT_IN[0].atlas.items).toEqual([]);
  });
  it("a fresh blank profile holds nothing but a welcome draft", () => {
    const o = fresh(BUILT_IN[0]);
    expect(o.regions).toEqual({}); expect(o.quests).toEqual([]); expect(o.atlasDef.items).toEqual([]);
    expect(o.bio.name).toBe(""); expect(o.posts.length).toBe(1);
  });
});

describe("fresh", () => {
  it("creates a valid profile from a pack", () => {
    const o = fresh(DEMO);
    expect(o.pack.id).toBe("demo-pack"); expect(o.plan.months).toBe(12);
    expect(allSkills(o).length).toBe(3); expect(o.atlasDef.items.length).toBe(2);
    expect(allSkills(o).every(s => s.status === "locked" && s.progress === 0)).toBe(true);
    expect(o.pack.labels.quests).toBe("Missions");
  });
  it("rescales every window when the user picks a different plan length", () => {
    const o = fresh(DEMO, { months: 4 });
    expect(o.plan.months).toBe(4);
    for (const x of [...allSkills(o), ...o.quests]) { expect(x.start).toBeGreaterThanOrEqual(1); expect(x.end).toBeLessThanOrEqual(4); expect(x.end).toBeGreaterThanOrEqual(x.start); }
    expect(o.plan.phases.at(-1).end).toBe(4);
  });
  it("keeps the user's character choices", () => {
    const o = fresh(tiny(), { bio: { name: "Ada", title: "Student", emblem: "atom" }, prefs: { theme: "aurora", gamify: false } });
    expect(o.bio).toMatchObject({ name: "Ada", title: "Student", emblem: "atom" });
    expect(o.prefs).toMatchObject({ theme: "aurora", gamify: false, sound: false });
  });
});

describe("normalize", () => {
  it("is idempotent", () => {
    const o = fresh(DEMO);
    const once = JSON.stringify(normalize(clone(o), DEMO));
    expect(JSON.stringify(normalize(JSON.parse(once), DEMO))).toBe(once);
  });
  it("drops links to skills that no longer exist", () => {
    const o = fresh(tiny());
    o.quests[0].proves.push("gone"); o.posts[0].skills = ["gone", "aa-one"]; allSkills(o)[1].prereqs.push("gone");
    normalize(o, tiny());
    expect(o.quests[0].proves).toEqual(["aa-one"]); expect(o.posts[0].skills).toEqual(["aa-one"]); expect(allSkills(o)[1].prereqs).toEqual(["aa-one"]);
  });
  it("defaults a save without a plan length to 36 months (older single-file saves)", () => {
    expect(normalize({ regions: {}, plan: { start: "2025-01-01" } }, tiny()).plan.months).toBe(36);
  });
  it("fills new preferences into older saves", () => {
    const o = normalize({ regions: {}, prefs: { accent: "azure" } }, tiny());
    expect(o.prefs).toMatchObject({ theme: "nebula", fx: true, sound: false, starter: true });
    expect(o.bio.emblem).toBe("compass");
  });
});

describe("upgradeContent", () => {
  it("brings in new content while keeping progress, notes and the user's own items", () => {
    const o = fresh(tiny());
    const one = allSkills(o)[0];
    one.progress = 40; one.status = "active"; one.notes = "mine"; one.musts[0].done = true;
    one.musts.push({ id: "mu123abc", text: "My own must-know", done: false });
    one.sources.push({ id: "s99xyz", type: "note", title: "My source", done: false });
    o.atlas["a-idea"] = 2;
    o.atlasDef.items.push({ id: "u1abc", cat: "ideas", name: "My idea" });

    const v2 = tiny({ revision: 2 });
    v2.regions.aa.skills[0].name = "One (revised)";
    v2.regions.aa.skills[0].musts.push({ id: "aa-one-m2", text: "Something new" });
    v2.regions.aa.skills.push({ id: "aa-three", name: "Three", tier: "specialist", start: 10, end: 12 });
    v2.atlas.items.push({ id: "a-new", cat: "ideas", name: "New idea" });

    const up = migrate(clone(o), v2);
    const s1 = allSkills(up).find(s => s.id === "aa-one");
    expect(s1.name).toBe("One (revised)");
    expect(s1.progress).toBe(40); expect(s1.notes).toBe("mine");
    expect(s1.musts.find(m => m.id === "aa-one-m1").done).toBe(true);
    expect(s1.musts.map(m => m.id)).toEqual(expect.arrayContaining(["aa-one-m2", "mu123abc"]));
    expect(s1.sources.map(x => x.id)).toContain("s99xyz");
    expect(allSkills(up).map(s => s.id)).toContain("aa-three");
    expect(up.atlas["a-idea"]).toBe(2);
    expect(up.atlasDef.items.map(a => a.id)).toEqual(expect.arrayContaining(["a-new", "u1abc"]));
    expect(up.pack.revision).toBe(2);
  });
  it("removes a skill the pack dropped only if the user never touched it", () => {
    const o = fresh(tiny());
    allSkills(o).find(s => s.id === "aa-one").progress = 10;
    const v2 = tiny({ revision: 2 }); v2.regions.aa.skills = []; v2.quests[0].proves = [];
    upgradeContent(o, v2);
    expect(allSkills(o).map(s => s.id)).toEqual(["aa-one"]);
  });
  it("does nothing to a save from a different pack", () => {
    const o = fresh(tiny()), blank = { ...BUILT_IN[0], revision: 99 };
    expect(JSON.stringify(migrate(clone(o), blank))).toBe(JSON.stringify(normalize(clone(o), blank)));
  });
});

describe("older saves", () => {
  it("migrates a save without pack info and merges the pack in once", () => {
    const o = fresh(DEMO);
    allSkills(o)[0].progress = 55;
    delete o.pack; delete o.atlasDef; delete o.plan.months; delete o.plan.phases; o.version = 3; o.meta = { content: 3 };
    const m = migrate(o, DEMO);
    expect(m.pack.id).toBe("demo-pack"); expect(m.plan.months).toBe(36);
    expect(allSkills(m)[0].progress).toBe(55);
    expect(m.atlasDef.items.length).toBe(2);
  });
  it("recognizes which known pack an old backup belongs to", () => {
    const o = fresh(DEMO); delete o.pack;
    expect(detectPack(o, [...BUILT_IN, DEMO]).id).toBe("demo-pack");
    expect(detectPack({ regions: {} }, [DEMO])).toBe(null);
  });
});

describe("helpers", () => {
  it("mergeList carries done flags by id, by text, and fuzzily", () => {
    const out = mergeList([{ id: "x-1", text: "Linear maps" }, { id: "x-2", text: "Eigenvalues and eigenvectors of matrices" }],
      [{ id: "x-1", text: "old", done: true }, { id: "x-9", text: "eigenvalues eigenvectors matrices", done: true }, { id: "mine", text: "Mine", done: false }],
      x => !isContentId(x.id), { fuzzy: true });
    expect(out.map(x => x.done)).toEqual([true, true, false]);
    expect(out.at(-1).id).toBe("mine");
  });
  it("scaleWin and rescale stay inside the plan", () => {
    expect(scaleWin(1, 36, 36, 12)).toEqual([1, 12]);
    expect(scaleWin(34, 36, 36, 12)).toEqual([12, 12]);
    const o = rescale(fresh(tiny()), 30);
    expect(o.plan.months).toBe(30);
    expect([...allSkills(o), ...o.quests].every(x => x.end <= 30 && x.start >= 1 && x.end >= x.start)).toBe(true);
  });
  it("defaultPhases covers the whole plan", () => {
    for (const m of [1, 3, 4, 10, 37, 240]) { const p = defaultPhases(m); expect(p[0].start).toBe(1); expect(p.at(-1).end).toBe(m); }
  });
});
