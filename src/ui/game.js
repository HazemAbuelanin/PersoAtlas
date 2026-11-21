/* The game layer: living background, particle bursts, level-up screen, unlock cards, XP floaters, sound.
   Everything here is cosmetic and respects the Motion, Effects, Sound and Game-layer settings. */
import { rankOf } from "../core/config.js";
import { trophyProgress, unlockKeys } from "../core/achievements.js";
import { l } from "../core/labels.js";
import { updateProfile } from "../core/profiles.js";
import { PROFILE, S } from "../core/state.js";
import { $, esc } from "../core/util.js";
import { icon } from "./icons.js";

const motion = () => document.documentElement.dataset.motion === "full";
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const gameOn = () => S.prefs?.gamify !== false;

/** Fill {skill}-style placeholders with the user's vocabulary. */
export const words = t => String(t).replace(/\{(\w+)\}/g, (_, k) => {
  const cap = k[0] === k[0].toUpperCase(), key = k.toLowerCase();
  const plural = { skills: "skill", quests: "quest", posts: "post" }[key];
  const v = plural ? l(plural) + "s" : l(key);
  return cap ? v[0].toUpperCase() + v.slice(1) : v;
});

/* ---------- sound (synthesised, no files; off unless the user turns it on) ---------- */
let ac = null;
function tone(freq, at, dur, type = "sine", vol = 0.08) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
export function sfx(kind) {
  if (!S.prefs?.sound) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const seq = {
      tick: [[880, 0, 0.06, "triangle", 0.04]],
      unlock: [[660, 0, 0.14, "triangle"], [990, 0.08, 0.22, "triangle"]],
      major: [[523, 0, 0.18, "triangle"], [659, 0.09, 0.18, "triangle"], [784, 0.18, 0.18, "triangle"], [1047, 0.27, 0.4, "triangle", 0.09]],
      level: [[392, 0, 0.2, "sawtooth", 0.05], [523, 0.12, 0.2, "sawtooth", 0.05], [659, 0.24, 0.2, "sawtooth", 0.05], [784, 0.36, 0.25, "sawtooth", 0.06], [1047, 0.5, 0.8, "triangle", 0.1], [1319, 0.5, 0.8, "sine", 0.05]],
    }[kind] || [];
    seq.forEach(a => tone(...a));
  } catch (e) {}
}

/* ---------- living background: slow drifting, twinkling motes ---------- */
let bg = null;
export function startBackground() {
  const cv = $("#fxbg"); if (!cv) return;
  if (bg) cancelAnimationFrame(bg.raf);
  const on = S.prefs?.fx !== false && motion();
  const ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  size();
  const n = Math.round(Math.min(110, (innerWidth * innerHeight) / 16000));
  const c1 = css("--glow2") || "62,224,255", c2 = css("--glow") || "124,92,255";
  const motes = Array.from({ length: n }, () => ({
    x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.00006, vy: -0.00002 - Math.random() * 0.00007,
    p: Math.random() * Math.PI * 2, c: Math.random() < 0.7 ? c1 : c2,
  }));
  let last = 0;
  const draw = t => {
    bg.raf = requestAnimationFrame(draw);
    if (document.hidden || t - last < 33) return; // ~30 fps is plenty for ambience
    const dt = Math.min(64, t - last); last = t;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const m of motes) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.p += dt * 0.0015;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      if (m.x < -0.02) m.x = 1.02; else if (m.x > 1.02) m.x = -0.02;
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(m.p));
      ctx.beginPath(); ctx.fillStyle = `rgba(${m.c},${a})`; ctx.shadowColor = `rgba(${m.c},${a})`; ctx.shadowBlur = 6 * dpr;
      ctx.arc(m.x * cv.width, m.y * cv.height, m.r * dpr, 0, Math.PI * 2); ctx.fill();
    }
  };
  bg = { raf: 0 };
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (on) bg.raf = requestAnimationFrame(draw);
  else motes.forEach(m => { ctx.beginPath(); ctx.fillStyle = `rgba(${m.c},.35)`; ctx.arc(m.x * cv.width, m.y * cv.height, m.r * dpr, 0, Math.PI * 2); ctx.fill(); });
  if (!startBackground.wired) { startBackground.wired = true; let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(startBackground, 200); }); }
}

/* ---------- particle burst ---------- */
export function burst(x, y, { count = 80, spread = 1, colors } = {}) {
  if (!motion() || S.prefs?.fx === false) return;
  const cv = document.createElement("canvas"); cv.className = "burst"; document.body.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const ctx = cv.getContext("2d");
  const cols = colors || [css("--gold"), css("--cyan"), css("--blue"), "#ffffff"];
  const ps = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 7) * spread;
    return { x: x * dpr, y: y * dpr, vx: Math.cos(a) * v * dpr, vy: Math.sin(a) * v * dpr - 3 * dpr, s: (2 + Math.random() * 4) * dpr, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 1 };
  });
  const t0 = performance.now();
  const step = t => {
    const k = (t - t0) / 1600; ctx.clearRect(0, 0, cv.width, cv.height);
    if (k >= 1) return cv.remove();
    for (const p of ps) {
      p.vy += 0.18 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- level up ---------- */
export function levelUp(lvl) {
  if (!gameOn()) return;
  const el = document.createElement("div"); el.className = "levelup"; el.setAttribute("role", "status");
  el.innerHTML = `${icon("hex", "lu-hex")}<div class="lu"><div class="lu-k">Level up</div><div class="lu-n">${lvl}</div><div class="lu-r">${esc(rankOf(lvl))}</div></div>`;
  document.body.appendChild(el);
  sfx("level");
  burst(innerWidth / 2, innerHeight / 2, { count: 160, spread: 1.4 });
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 420); };
  el.onclick = close; setTimeout(close, 2600);
  const b = $("#lvl"); if (b) { b.classList.remove("up"); void b.offsetWidth; b.classList.add("up"); }
}

/* ---------- unlock cards ---------- */
const KIND = { trophy: "Achievement unlocked", "skill-start": "Unlocked", "skill-master": "Mastered", region: "Conquered", quest: "Complete" };
export function unlockCard(u) {
  const box = $("#unlocks"); if (!box) return;
  const el = document.createElement("div");
  el.className = "unlock" + (u.major ? "" : " minor");
  el.innerHTML = `<div class="ub">${icon(u.icon)}</div><div class="uk">${esc(u.kind === "trophy" ? KIND.trophy : words(u.desc))}</div><div class="ut">${esc(u.title)}</div>${u.kind === "trophy" ? `<div class="ud">${esc(words(u.desc))}</div>` : ""}`;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  sfx(u.major ? "major" : "unlock");
  if (u.major) requestAnimationFrame(() => { const r = el.getBoundingClientRect(); burst(r.left + 34, r.top + r.height / 2, { count: 50, spread: 0.7 }); });
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 380); }, u.major ? 4800 : 3200);
}

/** Compare what the state earns now with what was already celebrated; celebrate the difference. */
export function checkProgress(level) {
  const keys = unlockKeys(S, level);
  if (!Array.isArray(S.meta.unlocked)) { S.meta.unlocked = [...keys.keys()]; return []; } // first run: record silently
  const seen = new Set(S.meta.unlocked), fresh = [...keys].filter(([k]) => !seen.has(k));
  if (!fresh.length) return [];
  fresh.forEach(([k]) => S.meta.unlocked.push(k));
  if (gameOn()) {
    const order = { trophy: 0, region: 1, quest: 2, "skill-master": 3, "skill-start": 4 };
    const freshKeys = new Set(fresh.map(([k]) => k));
    fresh.filter(([k]) => !(k.startsWith("a:") && freshKeys.has("m:" + k.slice(2))))
      .sort((a, b) => order[a[1].kind] - order[b[1].kind]).slice(0, 4).forEach(([, u], i) => setTimeout(() => unlockCard(u), i * 450));
  }
  return fresh;
}
export const trophies = level => trophyProgress(S, level).map(t => ({ ...t, desc: words(t.desc) }));

/* ---------- XP floater ---------- */
export function floatXP(n) {
  if (!gameOn() || !(n > 0) || !motion()) return;
  const bar = $("#xpbar")?.parentElement; if (!bar) return;
  const r = bar.getBoundingClientRect(), el = document.createElement("div");
  el.className = "xpfloat"; el.textContent = `+${n} XP`;
  el.style.left = `${r.left + Math.min(r.width, r.width * 0.6)}px`; el.style.top = `${r.top - 12}px`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
}

/** Keep a tiny snapshot of the profile in the registry so the splash screen can show it before anything loads. */
export function snapshot(level) {
  if (!PROFILE) return;
  const snap = { name: S.bio.name || "", level, rank: rankOf(level), emblem: S.bio.emblem || "compass", theme: S.prefs.theme || "nebula", game: gameOn(), avatar: PROFILE.snap?.avatar || "" };
  const cur = PROFILE.snap || {};
  if (Object.keys(snap).some(k => snap[k] !== cur[k])) { PROFILE.snap = snap; updateProfile(PROFILE.id, { snap }); }
}
export function setSnapAvatar(dataUrl) {
  if (!PROFILE) return;
  PROFILE.snap = { ...(PROFILE.snap || {}), avatar: dataUrl || "" };
  updateProfile(PROFILE.id, { snap: PROFILE.snap });
}
