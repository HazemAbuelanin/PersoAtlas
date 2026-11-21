/* Loading screen: the player's avatar, level and rank (from the profile snapshot) while the atlas loads. */
import { esc } from "../core/util.js";
import { LOGO, icon } from "./icons.js";

export function showSplash(profile) {
  const snap = profile?.snap || {}, root = document.documentElement;
  root.dataset.theme = snap.theme || "nebula";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.motion = reduced ? "reduced" : "full";
  const el = document.getElementById("splash");
  const initials = (snap.name || "").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const face = snap.avatar ? `<img alt="" src="${esc(snap.avatar)}">` : initials ? esc(initials) : LOGO;
  el.innerHTML = `<div class="sp">
      <div class="sp-ava"><div class="orbit o2"></div><div class="orbit"></div><div class="face">${face}</div>${profile && snap.level && snap.game !== false ? `<div class="badge">${snap.level}</div>` : ""}</div>
      <div><div class="sp-title">${profile ? esc(snap.name || profile.name) : "PersoAtlas"}</div>
        <div class="sp-sub">${profile ? `${icon(snap.emblem || "compass", "sp-emb")} ${snap.game !== false && snap.rank ? esc(snap.rank) : "Welcome back"}` : "Map your learning journey"}</div></div>
      <div class="sp-bar"><i></i></div>
      <div class="sp-hint">${profile ? "Loading your atlas · click to skip" : "Click to begin"}</div></div>`;
  el.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { const b = el.querySelector(".sp-bar i"); if (b) b.style.width = "100%"; }));
  let done, gone = false;
  const ready = new Promise(r => (done = r));
  const minTime = reduced ? 250 : profile ? 1300 : 1100;
  const t = setTimeout(() => done(), minTime);
  el.onclick = () => { clearTimeout(t); done(); };
  addEventListener("keydown", function k(e) { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { removeEventListener("keydown", k); clearTimeout(t); done(); } });
  return {
    ready,
    hide() {
      if (gone) return; gone = true;
      el.classList.add("out");
      setTimeout(() => { el.hidden = true; el.classList.remove("out"); el.innerHTML = ""; }, 560);
    },
  };
}
