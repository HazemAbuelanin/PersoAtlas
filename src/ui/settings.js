/* The System panel: profile, plan, vocabulary, tabs, look, data & backup, content pack. */
import { APP_NAME, HIDEABLE, MAX_MONTHS, THEMES } from "../core/config.js";
import { sfx } from "./game.js";
import { L, LABEL_DEFAULTS, LABEL_HELP, LABEL_KEYS, LABEL_PRESETS } from "../core/labels.js";
import { clone, finish, normalize, rescale } from "../core/model.js";
import { checkPack, storePack } from "../core/packs.js";
import { monLabel } from "../core/plan.js";
import { deleteProfile, readProfiles, setActive, updateProfile } from "../core/profiles.js";
import { PACK, PRE_KEY, PROFILE, S, setPack, setState, syncPlan } from "../core/state.js";
import { $, $$, daysSince, defer, esc, hhmm, toast } from "../core/util.js";
import { exportJSON } from "../storage/backup.js";
import { dirHandle, dirName, folderPrompt, folderState, lastSync, linkFolder, loadFromFolder, readFolderData, setFolderPrompt, syncFolder, unlinkFolder } from "../storage/folder.js";
import { save } from "../storage/save.js";
import { fmtSize } from "./attachments.js";
import { applyLabels, applyPrefs, renderHud, resetUI, setView, view } from "./nav.js";
import { renderNow, resetWeek } from "../views/now.js";

export function dataBoxHTML() {
  if (folderPrompt) {
    const o = folderPrompt.obj;
    return `<div class="warnbox">“${esc(dirName())}” holds a ${APP_NAME} save${o.saved ? ` written ${esc(new Date(o.saved).toLocaleString())}` : ""}${folderPrompt.newer ? ", newer than this browser's data (probably from another computer)" : ""}. Which copy should win?</div>
      <div class="btns"><button class="btn primary" id="fpLoad">Load folder into this browser</button><button class="btn danger" id="fpOver">Overwrite folder</button><button class="btn ghost" id="fpCancel">Cancel</button></div>`;
  }
  if (folderState === "unsupported") return `<div class="note">This browser can't sync to a folder. Use Chrome or Edge for that, or export a backup regularly (it includes every attachment).</div>`;
  if (folderState === "linked") return `<div class="okbox">Syncing to “${esc(dirName())}”: persoatlas-data.json plus a files/ folder with every attachment.${lastSync ? ` Last sync ${hhmm(lastSync)}.` : ""}</div>
    <div class="btns"><button class="btn" id="fReload">Reload from folder</button><button class="btn ghost" id="fUnlink">Unlink</button></div>
    <div class="note">Keep this folder in Dropbox, OneDrive or Google Drive and link the same folder on your other computers. Use one folder per profile.</div>`;
  if (folderState === "needs-permission" || folderState === "error") return `<div class="warnbox">${folderState === "error" ? "The last sync to" : "The browser needs permission again for"} “${esc(dirName())}”.</div>
    <div class="btns"><button class="btn primary" id="fLink">Reconnect folder</button><button class="btn ghost" id="fUnlink">Unlink</button></div>`;
  return `<div class="note">Right now everything lives only in this browser. Link a folder and every change (text and all attachments) is written to disk. Keep it in a synced drive to use ${APP_NAME} on several computers; on a new computer, link the same folder to load it.</div>
    <button class="btn primary" id="fLink" style="align-self:flex-start">Link backup folder</button>`;
}

const presetOf = () => {
  const cur = S.prefs.labels || {};
  for (const [k, p] of Object.entries(LABEL_PRESETS)) { const want = p.labels; if (LABEL_KEYS.every(x => (cur[x] || "") === (want[x] || ""))) return k; }
  return "custom";
};
let confirmDel = false;

export function renderSettings() {
  const s = $("#settings"), m = document.documentElement.dataset.motion, age = daysSince(S.meta.lastExport), reg = readProfiles();
  const others = reg.list.filter(p => p.id !== PROFILE.id), preset = presetOf(), ph = S.plan.phases;
  s.innerHTML = `<span class="lbl">Profile</span>
    <div class="field"><label for="setPName">Profile name</label><input class="in" id="setPName" value="${esc(PROFILE.name)}"></div>
    <div class="note">Content pack: <strong>${esc(S.pack.name)}</strong> v${esc(S.pack.version)}</div>
    ${others.length ? `<div class="rows">${others.map(p => `<div class="kv"><span>${esc(p.name)}</span><button class="btn ghost" data-switch="${esc(p.id)}">Switch</button></div>`).join("")}</div>` : ""}
    <div class="btns"><button class="btn" id="setNewProfile">+ New profile</button>
      ${confirmDel ? `<button class="btn danger" id="setDelYes">Delete “${esc(PROFILE.name)}” and all its data?</button><button class="btn ghost" id="setDelNo">Keep</button>` : `<button class="btn ghost danger" id="setDel">Delete profile</button>`}</div>

    <span class="lbl">Plan</span>
    <div class="row2"><div class="field"><label for="setStart">Month 1 of the plan</label><input type="month" class="in" id="setStart" value="${esc(S.plan.start.slice(0, 7))}"></div>
      <div class="field"><label for="setMonths">Length (months)</label><input type="number" min="1" max="${MAX_MONTHS}" class="in" id="setMonths" value="${S.plan.months}"></div></div>
    <div class="row2"><div class="field"><label for="setHours">Weekly hours goal</label><input type="number" min="0" max="100" class="in" id="setHours" value="${esc(S.prefs.weeklyHours)}"></div>
      <div class="field"><label for="setWeek">Week starts on</label><select class="sel" id="setWeek">${[[1, "Monday"], [0, "Sunday"], [6, "Saturday"]].map(([v, n]) => `<option value="${v}" ${+S.prefs.weekStart === v ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
    <div class="note">Changing the length stretches or squeezes every ${esc(L("skill").toLowerCase())}, ${esc(L("quest").toLowerCase())} and phase to fit.</div>
    <details><summary class="lbl" style="cursor:pointer">Phases · ${ph.length}</summary>
      <div class="rows" style="padding-top:8px">${ph.map((p, i) => `<div class="phrow"><input class="in" data-ph="${i}" data-k="name" value="${esc(p.name)}" aria-label="Phase name"><input type="number" class="in" data-ph="${i}" data-k="start" min="1" max="${S.plan.months}" value="${p.start}" aria-label="Start month"><input type="number" class="in" data-ph="${i}" data-k="end" min="1" max="${S.plan.months}" value="${p.end}" aria-label="End month"><button class="x" data-phdel="${i}" aria-label="Remove phase">✕</button></div>`).join("")}</div>
      <button class="btn ghost" id="setPhAdd" style="margin-top:6px">+ Phase</button></details>

    <span class="lbl">Vocabulary</span>
    <div class="seg" id="vocabSeg">${Object.entries(LABEL_PRESETS).map(([k, p]) => `<button data-v="${k}" class="${preset === k ? "on" : ""}" title="${esc(p.hint)}">${esc(p.name)}</button>`).join("")}${preset === "custom" ? `<button class="on" disabled>Custom</button>` : ""}</div>
    <details><summary class="lbl" style="cursor:pointer">Rename anything</summary>
      <div class="vocab">${LABEL_KEYS.map(k => `<label class="note" for="lb-${k}">${esc(LABEL_HELP[k])}</label><input class="in" id="lb-${k}" data-lb="${k}" value="${esc(S.prefs.labels[k] || "")}" placeholder="${esc(S.pack.labels?.[k] || LABEL_DEFAULTS[k])}">`).join("")}</div></details>

    <span class="lbl">Tabs</span>
    <div class="checks">${HIDEABLE.map(v => `<label><input type="checkbox" class="chk" data-tab="${v}" ${(S.prefs.hiddenTabs || []).includes(v) ? "" : "checked"}> ${esc(L(v))}</label>`).join("")}</div>

    <span class="lbl">Game layer</span>
    <div class="seg" id="gameSeg"><button data-g="1" class="${S.prefs.gamify !== false ? "on" : ""}">XP &amp; levels</button><button data-g="0" class="${S.prefs.gamify === false ? "on" : ""}">Off</button></div>
    <span class="lbl">Theme</span><div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button class="theme-opt ${S.prefs.theme === k ? "on" : ""}" data-theme-pick="${k}" aria-pressed="${S.prefs.theme === k}"><i style="--sw:${t.sw}"></i>${esc(t.name)}</button>`).join("")}</div>
    <label class="toggle"><span>Living background</span><input type="checkbox" class="chk" id="setFx" ${S.prefs.fx !== false ? "checked" : ""}></label>
    <label class="toggle"><span>Sound effects</span><input type="checkbox" class="chk" id="setSound" ${S.prefs.sound ? "checked" : ""}></label>
    <label class="toggle"><span>Starter quests on ${esc(L("now"))}</span><input type="checkbox" class="chk" id="setStarter" ${S.prefs.starter !== false ? "checked" : ""}></label>
    <span class="lbl">Motion</span><div class="seg" id="motionSeg"><button data-m="full" class="${m === "full" ? "on" : ""}">Smooth</button><button data-m="reduced" class="${m === "reduced" ? "on" : ""}">Reduced</button></div>

    <span class="lbl">Data &amp; backup</span><div style="display:flex;flex-direction:column;gap:8px">${dataBoxHTML()}</div>
    <div class="btns"><button class="btn" id="setExport">Export backup</button><button class="btn" id="setImport">Import backup</button></div>
    ${(() => { try { return localStorage.getItem(PRE_KEY) ? `<div class="note">A copy of your data from before the last content update is kept in this browser.</div><button class="btn ghost" id="restorePre" style="align-self:flex-start">Restore pre-update copy</button>` : ""; } catch (e) { return ""; } })()}
    <div class="note">${age === null ? "No export yet." : `Last export ${age === 0 ? "today" : age + " days ago"}.`} Exports include every attachment.</div>
    <div class="note" id="storeInfo"></div>

    <span class="lbl">Content pack</span>
    <div class="note">Got a newer version of <strong>${esc(S.pack.name)}</strong> as a pack file? Load it to merge the new content in. Your progress, notes and own items are kept.</div>
    <button class="btn ghost" id="setPackFile" style="align-self:flex-start">Update from pack file</button>
    <div class="note">${APP_NAME} · created by <a href="https://github.com/HazemAbuelanin/PersoAtlas" target="_blank" rel="noopener">Hazem Abuelanin</a> · open source (MIT). Nothing you enter leaves this browser unless you export it.</div>`;

  const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
  // profile
  $("#setPName").onchange = e => { const v = e.target.value.trim(); if (!v) return; PROFILE.name = v; updateProfile(PROFILE.id, { name: v }); toast("Profile renamed"); };
  $$("[data-switch]", s).forEach(b => (b.onclick = () => { setActive(b.dataset.switch); location.reload(); }));
  on("setNewProfile", () => { try { sessionStorage.setItem("persoatlas.onboard", "1"); } catch (e) {} location.reload(); });
  on("setDel", () => { confirmDel = true; renderSettings(); });
  on("setDelNo", () => { confirmDel = false; renderSettings(); });
  on("setDelYes", async () => { await deleteProfile(PROFILE.id); location.reload(); });
  // plan
  $("#setStart").onchange = e => { if (!e.target.value) return; S.plan.start = e.target.value + "-01"; save(); renderHud(); defer(() => setView(view)); toast(`Month 1 is now ${monLabel(1)}`); };
  $("#setMonths").onchange = e => { const v = Math.round(+e.target.value); if (!(v >= 1)) return; rescale(S, v); normalize(S, PACK); syncPlan(); save(); resetUI(); toast(`The plan is now ${S.plan.months} months`); };
  $("#setHours").onchange = e => { S.prefs.weeklyHours = Math.max(0, +e.target.value || 0); save(); renderHud(); if (view === "now") renderNow(); };
  $("#setWeek").onchange = e => { S.prefs.weekStart = +e.target.value; resetWeek(); save(); renderHud(); if (view === "now") renderNow(); };
  const phChanged = () => { normalize(S, PACK); syncPlan(); save(); if (view === "now" || view === "map") setView(view); };
  $$("[data-ph]", s).forEach(el => (el.onchange = () => { const p = S.plan.phases[+el.dataset.ph]; p[el.dataset.k] = el.dataset.k === "name" ? el.value : +el.value; phChanged(); renderSettings(); }));
  $$("[data-phdel]", s).forEach(b => (b.onclick = () => { S.plan.phases.splice(+b.dataset.phdel, 1); if (!S.plan.phases.length) S.plan.phases = [{ name: "Plan", start: 1, end: S.plan.months }]; phChanged(); renderSettings(); }));
  on("setPhAdd", () => { const last = S.plan.phases.at(-1); const start = Math.min(S.plan.months, (last?.end || 0) + 1); S.plan.phases.push({ name: `Phase ${S.plan.phases.length + 1}`, start, end: S.plan.months }); phChanged(); renderSettings(); s.querySelector("details").open = true; });
  // vocabulary & tabs
  $$("#vocabSeg [data-v]", s).forEach(b => (b.onclick = () => { S.prefs.labels = clone(LABEL_PRESETS[b.dataset.v].labels); save(); applyLabels(); setView(view); renderSettings(); }));
  $$("[data-lb]", s).forEach(el => (el.onchange = () => { const v = el.value.trim(); if (v) S.prefs.labels[el.dataset.lb] = v; else delete S.prefs.labels[el.dataset.lb]; save(); applyLabels(); setView(view); renderSettings(); }));
  $$("[data-tab]", s).forEach(el => (el.onchange = () => {
    const t = el.dataset.tab, hid = new Set(S.prefs.hiddenTabs || []); if (el.checked) hid.delete(t); else hid.add(t);
    S.prefs.hiddenTabs = [...hid]; save(); applyLabels(); setView(view);
  }));
  $$("#gameSeg [data-g]", s).forEach(b => (b.onclick = () => { S.prefs.gamify = b.dataset.g === "1"; applyPrefs(); save(); renderHud(); setView(view); renderSettings(); }));
  $$("[data-theme-pick]", s).forEach(b => (b.onclick = () => { S.prefs.theme = b.dataset.themePick; applyPrefs(); save(); renderHud(); renderSettings(); }));
  $("#setFx").onchange = e => { S.prefs.fx = e.target.checked; applyPrefs(); save(); };
  $("#setSound").onchange = e => { S.prefs.sound = e.target.checked; save(); if (S.prefs.sound) sfx("unlock"); };
  $("#setStarter").onchange = e => { S.prefs.starter = e.target.checked; save(); if (view === "now") renderNow(); };
  $$("#motionSeg button").forEach(b => (b.onclick = () => { S.prefs.motion = b.dataset.m; applyPrefs(); save(); renderSettings(); }));
  // data
  on("fLink", linkFolder); on("fUnlink", unlinkFolder);
  on("fReload", async () => { const obj = await readFolderData(dirHandle); if (!obj) return toast(`No ${APP_NAME} save found in that folder yet`); setFolderPrompt({ obj, newer: false, reload: true }); renderSettings(); });
  on("fpLoad", () => loadFromFolder(folderPrompt.obj));
  on("fpOver", () => { setFolderPrompt(null); syncFolder().then(() => { renderSettings(); toast("Folder overwritten with this browser's data"); }); });
  on("fpCancel", () => { const wasReload = folderPrompt?.reload; setFolderPrompt(null); if (wasReload) renderSettings(); else unlinkFolder(); });
  on("restorePre", () => {
    const b = $("#restorePre");
    if (!b.classList.contains("arm")) { b.classList.add("arm"); b.textContent = "Replace current data with the pre-update copy?"; return; }
    try { const o = JSON.parse(localStorage.getItem(PRE_KEY)); o.pack = { ...(o.pack || {}), id: PACK.id, revision: PACK.revision }; setState(finish(normalize(o, PACK), PACK)); save(); resetUI(); toast("Pre-update copy restored"); } catch (e) { toast("Couldn't restore that copy"); }
  });
  on("setExport", exportJSON); on("setImport", () => $("#importFile").click());
  on("setPackFile", () => $("#packFile").click());
  if (navigator.storage?.estimate) navigator.storage.estimate().then(async e => {
    const kept = await navigator.storage.persisted?.(), el = $("#storeInfo");
    if (el) el.textContent = `Browser storage: ${fmtSize(e.usage || 0)} used of about ${fmtSize(e.quota || 0)}. ${kept ? "Protected from automatic cleanup." : "The browser may clear it under disk pressure, which is why the folder or exports matter."}`;
  });
}
export function toggleSettings(force) {
  const s = $("#settings"), open = force ?? s.hidden;
  s.hidden = !open; $("#sysBtn").setAttribute("aria-expanded", open);
  if (open) { confirmDel = false; renderSettings(); }
}

/** A newer pack file for the active profile: keep it and merge its content in. */
export async function updateFromPackFile(file) {
  let p; try { p = JSON.parse(await file.text()); } catch (e) { return toast("That file isn't valid JSON."); }
  const errs = checkPack(p); if (errs.length) return toast("Not a valid pack: " + errs[0]);
  if (p.id !== S.pack.id) return toast(`That pack is “${p.name}”, but this profile uses “${S.pack.name}”. Use System → New profile → "Start from a pack file".`);
  if ((p.revision || 1) <= (S.pack.revision || 0)) return toast(`You already have this version of ${p.name} (revision ${S.pack.revision}).`);
  try { localStorage.setItem(PRE_KEY, JSON.stringify(S)); } catch (e) {}
  try { storePack(p); } catch (e) {}
  setPack(p); setState(finish(S, p)); save(); resetUI();
  toast(`${p.name} updated to v${p.version}. Your progress was kept.`);
}
