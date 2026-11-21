#!/usr/bin/env node
/**
 * Compile pack folders (YAML) into pack JSON files and validate them.
 *
 *   npm run packs                       built-in packs in ./packs  → src/generated/packs.json (bundled into the app)
 *   npm run validate                    validate ./packs only
 *   node scripts/build-packs.mjs --dir ~/my-packs [--out ~/my-packs/dist]
 *                                       your own packs, kept anywhere outside the repo → importable <id>.json files
 *
 * A pack folder: pack.yaml, regions/<id>.yaml, quests.yaml, atlas/<category>.yaml (see docs/writing-a-pack.md).
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, checkPackDir } from "./pack-lib.mjs";

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? path.resolve(args[i + 1]) : null; };
const CHECK = args.includes("--check");
const EXTERNAL = opt("--dir");
const packsDir = EXTERNAL || path.join(ROOT, "packs");
const outDir = opt("--out") || (EXTERNAL ? path.join(EXTERNAL, "dist") : null);

const built = [];
let failed = false;
for (const id of fs.readdirSync(packsDir).sort()) {
  const dir = path.join(packsDir, id);
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(path.join(dir, "pack.yaml"))) continue;
  const { pack, errors: errs } = checkPackDir(dir);
  if (errs.length) { failed = true; console.error(`✗ ${id}\n  ${errs.slice(0, 40).join("\n  ")}${errs.length > 40 ? `\n  … and ${errs.length - 40} more` : ""}`); continue; }
  const n = Object.values(pack.regions).reduce((a, r) => a + r.skills.length, 0);
  console.log(`✓ ${id}  ${Object.keys(pack.regions).length} regions · ${n} skills · ${pack.quests.length} quests · ${pack.atlas.items.length} atlas items`);
  built.push(pack);
}
if (failed) { console.error("\nPack validation failed."); process.exit(1); }
if (CHECK) process.exit(0);

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  built.forEach(p => fs.writeFileSync(path.join(outDir, `${p.id}.json`), JSON.stringify(p, null, 1)));
  console.log(`\nWrote ${built.length} pack file(s) to ${outDir}. Import them in the app: first screen (or System → New profile) → "Start from a pack file".`);
} else {
  built.sort((a, b) => (b.id === "blank") - (a.id === "blank") || a.name.localeCompare(b.name));
  fs.mkdirSync(path.join(ROOT, "src/generated"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "src/generated/packs.json"), JSON.stringify(built));
}
