import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkPackDir, ROOT } from "../../scripts/pack-lib.mjs";
import { FIXTURE_DIR } from "../fixtures/load.js";

const tmpPack = (id, files) => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pa-")), id);
  for (const [f, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), body); }
  return dir;
};
const MANIFEST = "id: demo\nname: Demo\nplan:\n  months: 6\n";

describe("built-in packs", () => {
  it("only the Blank map is built in (the app ships no content)", () => expect(fs.readdirSync(path.join(ROOT, "packs"), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)).toEqual(["blank"]));
  it("blank is valid", () => expect(checkPackDir(path.join(ROOT, "packs", "blank")).errors).toEqual([]));
  it("the test fixture pack is valid", () => expect(checkPackDir(FIXTURE_DIR).errors).toEqual([]));
  it("the documented pack template is valid", () => expect(checkPackDir(path.join(ROOT, "docs", "pack-template")).errors).toEqual([]));
});

describe("pack validation", () => {
  it("accepts a minimal pack and generates IDs for plain-string items", () => {
    const { pack, errors } = checkPackDir(tmpPack("demo", {
      "pack.yaml": MANIFEST,
      "regions/basics.yaml": "name: Basics\nskills:\n  - id: basics-one\n    name: One\n    tier: foundation\n    start: 1\n    end: 2\n    musts: [First idea, Second idea]\n",
      "quests.yaml": "- id: q-first\n  code: Q1\n  name: First\n  start: 1\n  end: 2\n  proves: [basics-one]\n  checklist: [Done]\n",
      "atlas/ideas.yaml": "label: Ideas\nitems:\n  - name: Big idea\n    skill: basics-one\n",
    }));
    expect(errors).toEqual([]);
    expect(pack.regions.basics.skills[0].musts.map(m => m.id).every(id => id.startsWith("basics-one-m-"))).toBe(true);
    expect(pack.atlas.items[0].id).toBe("a-big-idea");
  });
  it("reports broken references, bad windows and duplicate IDs", () => {
    const { errors } = checkPackDir(tmpPack("demo", {
      "pack.yaml": MANIFEST,
      "regions/basics.yaml": "name: Basics\nskills:\n  - { id: basics-one, name: One, tier: core, start: 3, end: 9, prereqs: [basics-nope] }\n  - { id: basics-one, name: Dup, tier: core, start: 1, end: 1 }\n",
      "quests.yaml": "- { id: q-first, code: Q1, name: First, start: 1, end: 2, proves: [ghost-skill] }\n",
    }));
    const all = errors.join("\n");
    expect(all).toMatch(/outside the 6-month plan/);
    expect(all).toMatch(/unknown prerequisite "basics-nope"/);
    expect(all).toMatch(/duplicate id "basics-one"/);
    expect(all).toMatch(/proves unknown skill "ghost-skill"/);
  });
  it("rejects content IDs without a dash and folder/id mismatches", () => {
    const { errors } = checkPackDir(tmpPack("other", { "pack.yaml": MANIFEST, "regions/r.yaml": "name: R\nskills:\n  - { id: nodash, name: X, tier: core, start: 1, end: 1 }\n" }));
    expect(errors.join("\n")).toMatch(/must match its folder name/);
    expect(errors.join("\n")).toMatch(/schema: .*skills\/0\/id/);
  });
});
