/* HUD, tabs and navigation between views. */
import { HIDEABLE, THEMES, TIER_W, VIEWS, rankOf } from "../core/config.js";
import { L, l } from "../core/labels.js";
import { weekKey } from "../core/plan.js";
import { allSkills, streak, totalMin } from "../core/query.js";
import { M, S } from "../core/state.js";
import { $, $$, addDays, esc, pd, ymd } from "../core/util.js";
import { renderAvatar, urlCache } from "./attachments.js";
import { checkProgress, floatXP, levelUp, snapshot, startBackground } from "./game.js";
import { icon } from "./icons.js";
import { renderSettings } from "./settings.js";
import { save } from "../storage/save.js";
import { tick } from "./timer.js";
import { renderAtlas } from "../views/atlas.js";
import { renderBio } from "../views/bio.js";
import { renderBlog, resetBlog } from "../views/blog.js";
import { renderDuties, resetDuties } from "../views/duties.js";
import { renderInv, resetInv } from "../views/inventory.js";
import { renderNow, resetWeek } from "../views/now.js";
import { renderQuests, resetQuests } from "../views/quests.js";
import { renderMap } from "../views/roadmap.js";

export function applyPrefs() {
  const root = document.documentElement;
  root.dataset.theme = THEMES[S.prefs.theme] ? S.prefs.theme : "nebula";
  document.documentElement.dataset.motion = S.prefs.motion || (matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
  document.documentElement.classList.toggle("nogame", S.prefs.gamify === false);
  startBackground();
}
export const gamified = () => S.prefs.gamify !== false;
export const tabVisible = v => !HIDEABLE.includes(v) || !(S.prefs.hiddenTabs || []).includes(v);

/** Write the current vocabulary into every static label in the page. */
export function applyLabels() {
  const counts = { quests: "nQuest", atlas: "nAtlas", blog: "nBlog", duties: "nDuty" };
  $$(".tab").forEach(t => {
    const v = t.dataset.view, n = counts[v];
    t.innerHTML = esc(L(v)) + (n ? `<span class="n" id="${n}"></span>` : "");
    t.hidden = !tabVisible(v);
  });
  $$("[data-label]").forEach(el => (el.textContent = L(el.dataset.label)));
  $$("[data-addlabel]").forEach(el => (el.textContent = "+ " + L(el.dataset.addlabel)));
  $("#mapTitle").textContent = `${L("map")} · ${M} month${M > 1 ? "s" : ""}`;
  $("#atlasTitle").textContent = `${L("atlas")} · ${S.pack.atlas.title}`;
  $("#q").placeholder = `Search ${l("skill")}s and sources  ( / )`;
  $("#aq").placeholder = `Search the ${l("atlas")}`;
  $("#sQuestK").textContent = L("quests");
  document.title = `${S.bio.name ? S.bio.name + " · " : ""}PersoAtlas`;
  tabGeo = null;
}

export let view = "now";
export function xpCalc() {
  let xp = 0, mx = 0;
  allSkills().forEach(({ s }) => { const w = TIER_W[s.tier] || 1; xp += Math.round((s.progress || 0) * w); mx += 100 * w; });
  S.quests.forEach(q => { const w = (TIER_W[q.tier] || 1) * 2; xp += Math.round((q.progress || 0) * w); mx += 100 * w; });
  const mapPct = mx ? Math.round((xp / mx) * 100) : 0;
  xp += Object.values(S.atlas || {}).reduce((a, v) => a + (v === 2 ? 8 : v === 1 ? 3 : 0), 0);
  xp += S.posts.filter(p => p.status === "published").length * 25 + S.duties.filter(d => d.status === "completed").length * 40 + Math.floor(totalMin() / 30);
  return { xp, mapPct };
}
export const levelOf = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
export function renderHud() {
  const { xp, mapPct } = xpCalc(); let ma = 0, src = 0, srcd = 0;
  allSkills().forEach(({ s }) => { if (s.status === "mastered") ma++; (s.musts || []).forEach(x => { src++; if (x.done) srcd++; }); });
  const lvl = levelOf(xp), cur = 40 * (lvl - 1) ** 2, nxt = 40 * lvl ** 2;
  if (renderHud.prev && lvl > renderHud.prev) levelUp(lvl);
  if (renderHud.xp != null && xp > renderHud.xp) floatXP(xp - renderHud.xp);
  renderHud.prev = lvl; renderHud.xp = xp;
  $(".hero").style.setProperty("--p", gamified() ? Math.round(((xp - cur) / (nxt - cur)) * 100) : mapPct);
  $("#hudRank").textContent = gamified() ? `${rankOf(lvl)} · LV ${lvl}` : "";
  $("#lvl").textContent = lvl;
  $("#xpbar").style.width = (gamified() ? Math.min(100, ((xp - cur) / (nxt - cur)) * 100) : mapPct) + "%";
  $("#xpt").textContent = gamified() ? `LV ${lvl} · ${xp - cur} / ${nxt - cur} XP to next · ${mapPct}% of map` : `${mapPct}% of the plan done`;
  const wk = weekKey(new Date()), we = ymd(addDays(pd(wk), 6)), wmin = S.sessions.filter(x => x.date >= wk && x.date <= we).reduce((a, x) => a + (+x.min || 0), 0);
  $("#sMast").textContent = ma; $("#sQuest").textContent = `${S.quests.filter(q => q.status === "done").length}/${S.quests.length}`;
  $("#sWeek").textContent = `${(wmin / 60).toFixed(1)}/${S.prefs.weeklyHours || 0}h`; $("#sStreak").textContent = streak() + "d"; $("#sSrc").textContent = `${srcd}/${src}`;
  $("#hudName").innerHTML = icon(S.bio.emblem || "compass", "emb") + esc([S.bio.name || "Your name", S.bio.title].filter(Boolean).join(" · "));
  $("#hudSpec").textContent = S.bio.specialization ? `Focus: ${S.bio.specialization}` : S.pack.id === "blank" ? "" : S.pack.name;
  const set = (id, v) => { const el = $("#" + id); if (el && el.textContent !== v) { el.textContent = v; tabGeo = null; } };
  set("nAtlas", `${Object.values(S.atlas || {}).filter(v => v > 0).length}/${S.atlasDef.items.length}`);
  set("nBlog", String(S.posts.length)); set("nDuty", String(S.duties.length)); set("nQuest", String(S.quests.length));
  if (!tabGeo) moveTabInd();
  if (checkProgress(lvl).length) save();
  snapshot(lvl);
}
export let tabGeo = null;
export function measureTabs() { tabGeo = {}; $$(".tab").forEach(t => (tabGeo[t.dataset.view] = [t.offsetLeft, t.offsetWidth])); }
export function remeasureTabs() { tabGeo = null; moveTabInd(); }
export function moveTabInd() {
  if (!tabGeo) measureTabs();
  const g = tabGeo[view], ts = $$(".tab").filter(t => !t.hidden), wrap = ts.some(x => x.offsetTop !== ts[0].offsetTop);
  $("#tabind").style.display = wrap ? "none" : "";
  if (g && !wrap) { $("#tabind").style.transform = `translateX(${g[0]}px)`; $("#tabind").style.width = g[1] + "px"; }
}
export function setView(v) {
  if (!VIEWS.includes(v) || !tabVisible(v)) v = "now";
  view = v;
  $$(".tab").forEach(t => { const on = t.dataset.view === v; t.classList.toggle("on", on); t.setAttribute("aria-selected", on); });
  VIEWS.forEach(x => ($("#v-" + x).hidden = x !== v)); moveTabInd();
  try { sessionStorage.setItem("persoatlas.view", v); } catch (e) {}
  ({ now: renderNow, inv: renderInv, quests: renderQuests, map: renderMap, atlas: renderAtlas, blog: renderBlog, duties: renderDuties, bio: renderBio })[v]();
}
/** Re-render everything after the whole state changed (import, folder load, plan change). */
export function resetUI() {
  Object.keys(urlCache).forEach(k => { URL.revokeObjectURL(urlCache[k]); delete urlCache[k]; });
  resetInv(); resetQuests(); resetBlog(); resetDuties(); resetWeek();
  applyPrefs(); applyLabels(); renderAvatar(); renderHud(); tick(); setView(view);
  if (!$("#settings").hidden) renderSettings();
}
