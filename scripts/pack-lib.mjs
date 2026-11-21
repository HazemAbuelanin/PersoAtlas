/**
 * Pack compiler and validator (used by build-packs.mjs and the unit tests).
 * Compile a packs/<id>/ folder (YAML) into one pack JSON, validate it, and write:
 *   src/generated/packs.json   built-in packs bundled into the app
 *   public/packs/<id>.json     downloadable packs (importable in the app)
 *   public/packs/index.json    catalog
 *
 * Folder layout (see docs/writing-a-pack.md):
 *   pack.yaml            manifest: id, name, plan, labels, atlas settings…
 *   regions/<id>.yaml    one region with its skills
 *   quests.yaml          list of quests (optional)
 *   atlas/<cat>.yaml     one atlas category with its items (optional)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv from "ajv";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/pack.schema.json"), "utf8"));
export const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);

const readYaml = f => YAML.parse(fs.readFileSync(f, "utf8"), { prettyErrors: true }) ?? {};
const listYaml = d => (fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.ya?ml$/.test(f)).sort() : []);
const hash = t => crypto.createHash("sha1").update(String(t)).digest("hex").slice(0, 8);
const slug = t => String(t).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || hash(t);

/** Items may be written as plain strings; give them stable IDs derived from their parent and text. */
const checks = (list, parent, kind) =>
  (list || []).map(x => (typeof x === "string" ? { id: `${parent}-${kind}-${hash(x)}`, text: x } : { ...x, id: x.id || `${parent}-${kind}-${hash(x.text)}` }));
const sources = (list, parent) =>
  (list || []).map(x => (typeof x === "string" ? { id: `${parent}-s-${hash(x)}`, type: "note", title: x } : { ...x, id: x.id || `${parent}-s-${hash(x.title)}` }));

export function compilePack(dir) {
  const man = readYaml(path.join(dir, "pack.yaml"));
  const regions = {};
  listYaml(path.join(dir, "regions")).forEach((f, i) => {
    const { id = path.basename(f).replace(/\.ya?ml$/, ""), skills = [], ...r } = readYaml(path.join(dir, "regions", f));
    regions[id] = {
      order: i, ...r,
      skills: skills.map(s => ({ ...s, musts: checks(s.musts, s.id, "m"), sources: sources(s.sources, s.id) })),
    };
  });
  const qf = path.join(dir, "quests.yaml");
  const quests = (fs.existsSync(qf) ? readYaml(qf) : []) || [];
  const cats = [], items = [];
  listYaml(path.join(dir, "atlas"))
    .map(f => ({ id: path.basename(f).replace(/\.ya?ml$/, ""), ...readYaml(path.join(dir, "atlas", f)) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach(c => {
      cats.push({ id: c.id, label: c.label || c.id });
      (c.items || []).forEach(a => items.push({ ...a, id: a.id || `a-${slug(a.name)}`, cat: c.id }));
    });
  const { atlas: atlasMeta = {}, ...rest } = man;
  return {
    format: 1, revision: 1, version: "1.0.0", ...rest,
    atlas: { ...atlasMeta, cats, items },
    regions,
    quests: quests.map(q => ({ ...q, checklist: checks(q.checklist, q.id, "c"), sources: sources(q.sources, q.id) })),
  };
}

/** Checks the schema cannot express: unique IDs, references, month windows. */
export function lint(p) {
  const errs = [];
  const months = p.plan?.months || 0;
  const ids = new Map();
  const claim = (id, where) => { if (ids.has(id)) errs.push(`duplicate id "${id}" (${where} and ${ids.get(id)})`); else ids.set(id, where); };
  const skillIds = new Set();
  const win = (x, what) => {
    if (x.start > months || x.end > months) errs.push(`${what}: window M${x.start}–M${x.end} is outside the ${months}-month plan`);
    if (x.end < x.start) errs.push(`${what}: end month is before start month`);
  };
  Object.entries(p.regions || {}).forEach(([rid, r]) => (r.skills || []).forEach(s => {
    claim(s.id, `skill in ${rid}`); skillIds.add(s.id); win(s, `skill ${s.id}`);
    (s.musts || []).forEach(m => claim(m.id, `must-know of ${s.id}`));
    (s.sources || []).forEach(x => claim(x.id, `source of ${s.id}`));
  }));
  Object.values(p.regions || {}).forEach(r => (r.skills || []).forEach(s =>
    (s.prereqs || []).forEach(x => { if (!skillIds.has(x)) errs.push(`skill ${s.id}: unknown prerequisite "${x}"`); if (x === s.id) errs.push(`skill ${s.id} lists itself as a prerequisite`); })));
  (p.quests || []).forEach(q => {
    claim(q.id, "quest"); win(q, `quest ${q.id}`);
    (q.proves || []).forEach(x => { if (!skillIds.has(x)) errs.push(`quest ${q.id}: proves unknown skill "${x}"`); });
    (q.checklist || []).forEach(c => claim(c.id, `checklist of ${q.id}`));
    (q.sources || []).forEach(x => claim(x.id, `source of ${q.id}`));
  });
  const catIds = new Set((p.atlas?.cats || []).map(c => c.id));
  (p.atlas?.items || []).forEach(a => {
    claim(a.id, "atlas item");
    if (!catIds.has(a.cat)) errs.push(`atlas item ${a.id}: unknown category "${a.cat}"`);
    if (a.skill && !skillIds.has(a.skill)) errs.push(`atlas item ${a.id}: unknown skill "${a.skill}"`);
  });
  (p.plan?.phases || []).forEach(ph => { if (ph.end > months || ph.end < ph.start) errs.push(`phase "${ph.name}": bad window ${ph.start}–${ph.end}`); });
  return errs;
}

/** Compile and fully validate one pack folder. Returns { pack, errors }. */
export function checkPackDir(dir) {
  let pack;
  try { pack = compilePack(dir); } catch (e) { return { pack: null, errors: [e.message] }; }
  const errors = [];
  const folder = path.basename(dir);
  if (pack.id !== folder) errors.push(`pack.yaml id "${pack.id}" must match its folder name "${folder}"`);
  if (!validate(pack)) validate.errors.forEach(e => errors.push(`schema: ${e.instancePath || "/"} ${e.message}${e.params?.additionalProperty ? ` (${e.params.additionalProperty})` : ""}`));
  errors.push(...lint(pack));
  return { pack, errors };
}
