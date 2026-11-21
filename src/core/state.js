/* The live state of the active profile. `S` is one stable object: replace its contents with setState(), never rebind it. */
import { migrate, fresh } from "./model.js";
import { getPack, stubPack } from "./packs.js";
import { stateKey, preUpgradeKey, dbName, updateProfile } from "./profiles.js";

export const S = {};
/** Plan length in months and phases as [name,start,end], kept in sync with S.plan. */
export let M = 12;
export let PHASES = [];
/** The full content pack of the active profile (or a stand-in when it isn't available here). */
export let PACK = null;
export let PROFILE = null;
export let KEY = "", PRE_KEY = "", DB_NAME = "persoatlas";
export let bootNote = "";

export function syncPlan() {
  M = S.plan?.months || 12;
  PHASES = (S.plan?.phases || []).map(p => [p.name, p.start, p.end]);
}
export function setState(o) {
  if (o === S) return syncPlan();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, o);
  syncPlan();
}
export function setPack(p) { PACK = p; }
export function setBootNote(t) { bootNote = t; }

/** Load (or create) the state of a profile. */
export function useProfile(profile) {
  PROFILE = profile; KEY = stateKey(profile.id); PRE_KEY = preUpgradeKey(profile.id); DB_NAME = dbName(profile.id);
  PACK = getPack(profile.packId);
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) {}
  if (raw) {
    try {
      const o = JSON.parse(raw);
      if (!PACK) PACK = stubPack(o.pack || { id: profile.packId });
      const before = o.pack?.revision ?? 0;
      const st = migrate(o, PACK);
      if (o.pack?.id === PACK.id && before < (PACK.revision || 1)) {
        try { localStorage.setItem(PRE_KEY, raw); } catch (e) {}
        bootNote = `${PACK.name} content updated to v${PACK.version}. Your progress, notes and files were kept.`;
      }
      setState(st);
      return;
    } catch (e) {
      try { localStorage.setItem(KEY + ".unreadable", raw); } catch (e2) {}
      bootNote = "Saved data couldn't be read, so a fresh atlas was started. The unreadable copy is kept in this browser.";
    }
  }
  if (!PACK) PACK = stubPack({ id: profile.packId });
  setState(fresh(PACK, profile.init || {}));
  if (profile.init) updateProfile(profile.id, { init: undefined });
}
