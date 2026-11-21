/* Export a full backup (state + every attachment) and restore one. */
import { APP_NAME } from "../core/config.js";
import { detectPack, migrate } from "../core/model.js";
import { allPacks, getPack, stubPack } from "../core/packs.js";
import { updateProfile } from "../core/profiles.js";
import { PACK, PROFILE, S, setPack, setState } from "../core/state.js";
import { toast, today } from "../core/util.js";
import { IDB } from "./idb.js";
import { save } from "./save.js";
import { collectFiles, fmtSize } from "../ui/attachments.js";
import { resetUI, view } from "../ui/nav.js";
import { renderNow } from "../views/now.js";

export function copy(t, msg) { navigator.clipboard?.writeText(t).then(() => toast(msg), () => toast("Copy blocked by the browser")); }
export const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const slug = t => String(t || "atlas").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "atlas";

export async function exportJSON() {
  const ids = [...new Set(collectFiles(S))];
  if (ids.length) toast(`Packing ${ids.length} file${ids.length > 1 ? "s" : ""} into the backup…`);
  const attachments = {};
  for (const id of ids) { const rec = await IDB.get(id, "files").catch(() => null); if (rec) attachments[id] = { name: rec.name, type: rec.type, data: await blobToDataURL(rec.blob) }; }
  S.meta.lastExport = new Date().toISOString();
  const blob = new Blob([JSON.stringify({ app: APP_NAME, exported: S.meta.lastExport, profile: { name: PROFILE?.name || "" }, ...S, attachments })], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `persoatlas-${slug(PROFILE?.name)}-${today()}.json`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast(`Backup downloaded (${fmtSize(blob.size)})`); save(); if (view === "now") renderNow();
}

/** Which pack does a backup belong to? Its own record of it, or (older backups) the built-in pack it overlaps most. */
export function packForBackup(o) {
  if (o.pack?.id) return getPack(o.pack.id) || stubPack(o.pack);
  return detectPack(o, allPacks()) || PACK;
}

export async function importJSON(file) {
  let o;
  try { o = JSON.parse(await file.text()); } catch (e) { return toast("That file isn't valid JSON."); }
  if (o?.format === 1 && o.atlas && o.plan) return toast("That's a content pack, not a backup. Use System → New profile → “Start from a pack file”.");
  try {
    if (o.regions && typeof o.regions === "object" && !Array.isArray(o.regions)) {
      const pack = packForBackup(o);
      if (pack.id !== PACK.id) { setPack(pack); updateProfile(PROFILE.id, { packId: pack.id }); }
      let restored = 0;
      for (const [id, f] of Object.entries(o.attachments || {})) {
        try { const blob = await (await fetch(f.data)).blob(); await IDB.set(id, { blob, name: f.name, type: f.type }, "files"); restored++; } catch (e) {}
      }
      setState(migrate(o, pack));
      toast(restored ? `Backup restored with ${restored} files` : "Backup restored");
    } else if (o && typeof o === "object" && Object.values(o).length && Object.values(o).every(r => r && Array.isArray(r.skills))) {
      setState(migrate({ ...S, regions: o }, PACK)); toast("Regions restored");
    } else throw new Error("unknown file");
    save(); resetUI();
  } catch (e) { toast(`That file isn't a ${APP_NAME} backup. Export one first, then import it here.`); }
}
