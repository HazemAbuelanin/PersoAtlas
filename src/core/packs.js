/* Content packs: the built-in ones (compiled from packs/ at build time) plus any the user imported. */
import BUILT_IN from "../generated/packs.json";

const STORE = id => `persoatlas.pack.${id}`;
export const builtInPacks = () => BUILT_IN;

/** Imported packs are kept in localStorage so the profile that uses them can upgrade later. */
export function storedPacks() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("persoatlas.pack.")) { const p = JSON.parse(localStorage.getItem(k)); if (p?.id) out.push(p); } } } catch (e) {}
  return out;
}
export const allPacks = () => { const seen = new Set(BUILT_IN.map(p => p.id)); return [...BUILT_IN, ...storedPacks().filter(p => !seen.has(p.id))]; };
export const getPack = id => BUILT_IN.find(p => p.id === id) || storedPacks().find(p => p.id === id) || null;

/** A stand-in when a profile's pack isn't available on this computer: the profile's own copy of the settings, no content. */
export function stubPack(meta = {}) {
  return { format: 1, id: meta.id || "custom", name: meta.name || "Custom", version: meta.version || "1.0.0", revision: meta.revision || 1,
    labels: meta.labels || {}, defaults: meta.defaults || {}, profile: meta.profile || {}, plan: {}, regions: {}, quests: [],
    atlas: { ...(meta.atlas || {}), cats: [], items: [] } };
}

/** Light structural check for a pack file a user imports (the full JSON Schema check runs in CI). */
export function checkPack(p) {
  const errs = [];
  if (!p || typeof p !== "object") return ["not a JSON object"];
  if (p.format !== 1) errs.push("missing \"format\": 1");
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(p.id || "")) errs.push("bad or missing id");
  if (!p.name) errs.push("missing name");
  if (!p.plan || !(p.plan.months >= 1)) errs.push("missing plan.months");
  if (!p.regions || typeof p.regions !== "object") errs.push("missing regions");
  if (!Array.isArray(p.quests)) errs.push("missing quests list");
  if (!p.atlas || !Array.isArray(p.atlas.items) || !Array.isArray(p.atlas.cats)) errs.push("missing atlas cats/items");
  return errs;
}
export function storePack(p) { localStorage.setItem(STORE(p.id), JSON.stringify(p)); }
