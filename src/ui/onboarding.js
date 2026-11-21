/* Character creation (first run and "New profile"). Three short steps, then the journey begins.
   Runs before the app starts, so it must not touch the live state S. */
import { APP_NAME, MAX_MONTHS, THEMES, rankOf } from "../core/config.js";
import { LABEL_DEFAULTS, LABEL_PRESETS } from "../core/labels.js";
import { clone, detectPack, thisMonth } from "../core/model.js";
import { allPacks, checkPack, getPack, storePack } from "../core/packs.js";
import { createProfile, readProfiles, updateProfile } from "../core/profiles.js";
import { $, $$, esc } from "../core/util.js";
import { EMBLEMS, LOGO, icon } from "./icons.js";

const PLAN_PRESETS = [3, 6, 12, 24, 36, 48];

/**
 * @param {{canCancel:boolean, onDone:(profile:object, restoreFile?:File, avatar?:File)=>void, onCancel?:()=>void}} opts
 */
export function openOnboarding(opts) {
  const box = $("#onboard"), root = document.documentElement;
  const v = { step: 0, name: "", title: "", emblem: "compass", months: 12, start: thisMonth().slice(0, 7), hours: 10, vocab: "game",
    theme: root.dataset.theme || "nebula", game: true, sound: false, packId: "blank", avatar: null, avatarUrl: "", err: "" };
  const packs = () => allPacks();
  const pack = () => getPack(v.packId) || packs()[0];
  const keep = () => {
    const f = id => $("#" + id);
    if (f("obName")) { v.name = f("obName").value; v.title = f("obTitle").value; }
    if (f("obMonths")) { v.months = f("obMonths").value; v.start = f("obStart").value; v.hours = f("obHours").value; if (f("obPack")) v.packId = f("obPack").value; }
  };
  const initials = () => (v.name || "").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const face = () => (v.avatarUrl ? `<img alt="" src="${v.avatarUrl}">` : initials() ? esc(initials()) : icon(v.emblem));
  const labelsOf = k => ({ ...LABEL_DEFAULTS, ...LABEL_PRESETS[k].labels });

  const steps = [
    () => `<div class="obgrid">
        <div class="obava"><div class="avatar" id="obAva" role="button" tabindex="0" title="Choose a picture">${face()}</div>
          <button class="btn ghost" id="obAvaBtn" type="button">${v.avatar ? "Change picture" : "Add a picture"}</button>
          <span class="note" style="text-align:center">Optional. Cropped to a circle; it never leaves this browser.</span></div>
        <div class="obstep">
          <div class="field"><label for="obName">Your name</label><input class="in" id="obName" autocomplete="name" value="${esc(v.name)}" placeholder="What should the atlas call you?"></div>
          <div class="field"><label for="obTitle">What you're becoming</label><input class="in" id="obTitle" value="${esc(v.title)}" placeholder="e.g. Data scientist · Medical student · Fluent in Japanese · Novelist"></div>
          <div class="field"><span class="lbl">Emblem</span><div class="pickrow">${EMBLEMS.map(e => `<button type="button" class="emb-opt ${v.emblem === e ? "on" : ""}" data-emb="${e}" title="${e}" aria-label="Emblem ${e}" aria-pressed="${v.emblem === e}">${icon(e)}</button>`).join("")}</div></div>
        </div></div>`,
    () => `<div class="obstep">
        ${packs().length > 1 ? `<div class="field"><label for="obPack">Starting map</label><select class="sel" id="obPack">${packs().map(p => `<option value="${esc(p.id)}" ${p.id === v.packId ? "selected" : ""}>${esc(p.name)}${p.id === "blank" ? " (start empty)" : ""}</option>`).join("")}</select>
          <span class="note">${esc(pack()?.description || "")}</span></div>` : `<div class="okbox">You start with a blank map and build it your way: areas, skills, projects and the ideas worth knowing. Have a pack file? Use “Start from a pack file” below.</div>`}
        <div class="field"><span class="lbl">How long is the journey?</span>
          <div class="chips">${PLAN_PRESETS.map(m => `<button type="button" class="chip ${+v.months === m ? "on" : ""}" data-months="${m}">${m < 12 ? m + " months" : m === 12 ? "1 year" : m / 12 + " years"}</button>`).join("")}</div></div>
        <div class="row3"><div class="field"><label for="obStart">Starting</label><input type="month" class="in" id="obStart" value="${esc(v.start)}"></div>
          <div class="field"><label for="obMonths">Length (months)</label><input type="number" class="in" id="obMonths" min="1" max="${MAX_MONTHS}" value="${esc(v.months)}"></div>
          <div class="field"><label for="obHours">Hours per week</label><input type="number" class="in" id="obHours" min="0" max="100" value="${esc(v.hours)}"></div></div>
        <div class="field"><span class="lbl">Speak my language</span><div class="seg" id="obVocab">${Object.entries(LABEL_PRESETS).map(([k, p]) => `<button type="button" data-v="${k}" class="${v.vocab === k ? "on" : ""}">${esc(p.name)}</button>`).join("")}</div>
          <span class="note">Your tabs will read: ${(() => { const W = labelsOf(v.vocab); return ["inv", "quests", "map", "atlas", "blog"].map(k => `<strong>${esc(W[k])}</strong>`).join(" · "); })()}. Rename anything later.</span></div>
      </div>`,
    () => `<div class="obstep">
        <div class="field"><span class="lbl">Theme</span><div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button type="button" class="theme-opt ${v.theme === k ? "on" : ""}" data-theme-pick="${k}" aria-pressed="${v.theme === k}"><i style="--sw:${t.sw}"></i>${esc(t.name)}</button>`).join("")}</div></div>
        <div class="preview-hud"><div class="avatar" style="width:64px;height:64px;font-size:22px">${face()}</div>
          <div><div class="prank">${v.game ? `${rankOf(1)} · LV 1` : ""}</div><div class="pname">${icon(v.emblem, "emb")}${esc(v.name || "Your name")}</div><div class="pclass">${esc(v.title || "Your path")}</div></div></div>
        <label class="toggle"><span><strong>Game layer</strong><br><span class="note">XP, levels, ranks, trophies and unlock moments.</span></span><input type="checkbox" class="chk" id="obGame" ${v.game ? "checked" : ""}></label>
        <label class="toggle"><span><strong>Sound effects</strong><br><span class="note">Soft chimes for unlocks and level-ups.</span></span><input type="checkbox" class="chk" id="obSound" ${v.sound ? "checked" : ""}></label>
      </div>`,
  ];
  const TITLES = [["Create your character", "Who is setting out on this journey?"], ["Plan the journey", "How long, how much time each week, and the words you like."], ["Make it yours", "Pick a look. Everything can be changed later in System."]];

  const draw = () => {
    root.dataset.theme = v.theme;
    box.innerHTML = `<div class="obcard" role="dialog" aria-modal="true" aria-labelledby="obH">
      <div class="obhead"><div class="logo">${LOGO}<span>PERSO<b>ATLAS</b></span></div><div class="steps" aria-label="Step ${v.step + 1} of 3">${[0, 1, 2].map(i => `<i class="${i <= v.step ? "on" : ""}"></i>`).join("")}</div></div>
      <div><h1 id="obH">${TITLES[v.step][0]}</h1><p class="lead">${v.step === 0 && !opts.canCancel ? `${APP_NAME} turns whatever you're learning into a game you play for real: areas and skills with time windows, projects that prove them, a roadmap, an atlas of ideas, focus sessions, a journal and a profile. Everything stays in this browser. ` : ""}${TITLES[v.step][1]}</p></div>
      ${steps[v.step]()}
      ${v.err ? `<div class="warnbox">${esc(v.err)}</div>` : ""}
      <div class="obfoot">
        <div class="oblinks"><button type="button" id="obRestore">Restore a backup</button><button type="button" id="obPackImport">Start from a pack file</button>${opts.canCancel ? `<button type="button" id="obCancel">Cancel</button>` : ""}</div>
        <div class="btns">${v.step ? `<button class="btn ghost" id="obBack" type="button">Back</button>` : ""}<button class="btn primary" id="obNext" type="button">${v.step < 2 ? "Continue" : "Begin the journey"}</button></div>
      </div>
      <input type="file" id="obAvaFile" accept="image/*" hidden><input type="file" id="obPackFile" accept="application/json,.json" hidden><input type="file" id="obBackupFile" accept="application/json,.json" hidden>
    </div>`;
    const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
    on("obNext", () => { keep(); v.err = ""; if (v.step < 2) { v.step++; draw(); $("#obNext")?.focus(); } else finish(); });
    on("obBack", () => { keep(); v.step--; draw(); });
    on("obCancel", () => { close(); opts.onCancel?.(); });
    const pickAva = () => $("#obAvaFile").click();
    on("obAva", pickAva); on("obAvaBtn", pickAva);
    if ($("#obAva")) $("#obAva").onkeydown = e => { if (e.key === "Enter") pickAva(); };
    $("#obAvaFile").onchange = e => {
      const f = e.target.files[0]; if (!f || !/^image\//.test(f.type)) return;
      keep(); v.avatar = f; if (v.avatarUrl) URL.revokeObjectURL(v.avatarUrl); v.avatarUrl = URL.createObjectURL(f); draw();
    };
    $$("[data-emb]", box).forEach(b => (b.onclick = () => { keep(); v.emblem = b.dataset.emb; draw(); }));
    $$("[data-months]", box).forEach(b => (b.onclick = () => { keep(); v.months = +b.dataset.months; draw(); }));
    $$("#obVocab [data-v]", box).forEach(b => (b.onclick = () => { keep(); v.vocab = b.dataset.v; draw(); }));
    if ($("#obPack")) $("#obPack").onchange = e => { keep(); v.packId = e.target.value; const p = pack(); v.months = p.plan?.months || v.months; v.hours = p.plan?.weeklyHours ?? v.hours; if (!v.title) v.title = p.profile?.title || ""; draw(); };
    $$("[data-theme-pick]", box).forEach(b => (b.onclick = () => { v.theme = b.dataset.themePick; draw(); }));
    if ($("#obGame")) $("#obGame").onchange = e => { v.game = e.target.checked; draw(); };
    if ($("#obSound")) $("#obSound").onchange = e => { v.sound = e.target.checked; };
    on("obPackImport", () => $("#obPackFile").click());
    $("#obPackFile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return; keep();
      try {
        const pk = JSON.parse(await f.text()); const errs = checkPack(pk); if (errs.length) throw new Error(errs.join(", "));
        storePack(pk); v.packId = pk.id; v.months = pk.plan?.months || v.months; v.hours = pk.plan?.weeklyHours ?? v.hours; if (!v.title) v.title = pk.profile?.title || ""; v.err = ""; v.step = Math.max(v.step, 1);
      } catch (x) { v.err = `That isn't a valid pack file (${x.message}).`; }
      draw();
    };
    on("obRestore", () => $("#obBackupFile").click());
    $("#obBackupFile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      let o; try { o = JSON.parse(await f.text()); } catch (x) { v.err = "That file isn't valid JSON."; return draw(); }
      if (!o?.regions) { v.err = `That file isn't a ${APP_NAME} backup.`; return draw(); }
      const p = (o.pack?.id && getPack(o.pack.id)) || detectPack(o, packs()) || getPack("blank");
      const id = createProfile({ name: o.profile?.name || (o.bio?.name ? `${o.bio.name}'s atlas` : "Restored atlas"), packId: o.pack?.id || p.id });
      close(); opts.onDone(readBack(id), f);
    };
  };
  const finish = () => {
    const p = pack(), months = Math.max(1, Math.min(MAX_MONTHS, Math.round(+v.months) || 12));
    const id = createProfile({ name: v.name.trim() ? `${v.name.trim()}'s atlas` : p.id === "blank" ? "My atlas" : p.name, packId: p.id });
    updateProfile(id, {
      init: {
        months, start: (v.start || thisMonth().slice(0, 7)) + "-01",
        bio: { name: v.name.trim(), title: v.title.trim(), emblem: v.emblem },
        prefs: { weeklyHours: Math.max(0, +v.hours || 0), labels: clone(LABEL_PRESETS[v.vocab].labels), theme: v.theme, gamify: v.game, sound: v.sound },
      },
      snap: { name: v.name.trim(), level: 1, rank: rankOf(1), emblem: v.emblem, theme: v.theme, game: v.game, avatar: "" },
    });
    const avatar = v.avatar; close(); opts.onDone(readBack(id), null, avatar);
  };
  const readBack = id => readProfiles().list.find(x => x.id === id);
  const close = () => { box.hidden = true; box.innerHTML = ""; document.body.classList.remove("onboarding"); if (v.avatarUrl) URL.revokeObjectURL(v.avatarUrl); };
  document.body.classList.add("onboarding");
  box.hidden = false;
  draw();
  setTimeout(() => $("#obName")?.focus(), 60);
}
