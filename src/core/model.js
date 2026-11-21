/* =====================================================================
   PersoAtlas data model. Pure functions (no DOM, no storage) so they can be unit tested.

   A profile's state S:
     version   DATA_VERSION
     pack      {id,name,version,revision,labels,atlas:{title,intro,states,sortByYear,link},defaults,profile}
               a copy of the content pack's settings, so a profile keeps working even without its pack file
     plan      {start:"YYYY-MM-01", months, phases:[{name,start,end}]}
     regions   {id:{name,code,color,desc,exit,never,section,order,files,skills:[Skill]}}
       Skill   {id,name,group,tier,start,end,cont,hpw,why,musts,prereqs,build,status,progress,notes,sources,files}
     quests    [{id,code,name,tier,start,end,hpw,status,progress,doneWhen,checklist,proves:[skillId],repo,notes,sources,files}]
     atlasDef  {cats:[{id,label}], items:[{id,cat,name,year,idea,skill,url}]}
     atlas     {itemId: 1|2}       1 = first level (e.g. understood), 2 = second level (e.g. implemented)
     posts     [{id,title,date,status,tags,url,body,skills:[skillId],quest,files}]
     duties    [{id,title,type,org,role,start,end,status,hours,link,desc,outcomes,tech,skills:[skillId],files}]
     weeks     {"YYYY-MM-DD"(week start):{goals:[{id,text,ref,done}],review}}
     sessions  [{id,date,min,ref:"s:<skill>"|"q:<quest>"|"",note}]
     timer     {start:ms,ref} | null
     bio, prefs, meta

   ID rule: content that comes from a pack has IDs containing a dash; IDs made in the app never do.
   That is how a pack upgrade tells pack content (safe to update) from the user's own additions (always kept).
   ===================================================================== */
import { DATA_VERSION, MIN_MONTHS, MAX_MONTHS, FALLBACK_CHECKLIST } from "./config.js";


export const clone = o => JSON.parse(JSON.stringify(o));
export const isContentId = id => String(id ?? "").includes("-");
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const thisMonth = () => ymd(new Date()).slice(0, 8) + "01";
export const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+n) || lo));
const rid = p => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

/** Four equal phases (or one, for very short plans). */
export function defaultPhases(months) {
  if (months < 4) return [{ name: "Plan", start: 1, end: months }];
  const names = ["Phase 1 · Foundations", "Phase 2 · Core", "Phase 3 · Depth", "Phase 4 · Mastery"];
  return names.map((name, i) => ({ name, start: Math.floor((i * months) / 4) + 1, end: Math.floor(((i + 1) * months) / 4) }));
}
/** Map a month window from a plan of `from` months onto a plan of `to` months. */
export function scaleWin(start, end, from, to) {
  if (!from || from === to) return [start, end];
  const a = clampInt(Math.floor(((start - 1) * to) / from) + 1, 1, to);
  return [a, clampInt(Math.max(a, Math.ceil((end * to) / from)), 1, to)];
}

export function packMeta(pack) {
  const a = pack.atlas || {};
  return {
    id: pack.id, name: pack.name, version: pack.version || "1.0.0", revision: pack.revision || 1,
    labels: { ...(pack.labels || {}) }, profile: { ...(pack.profile || {}) },
    defaults: { build: pack.defaults?.build || "", checklist: [...(pack.defaults?.checklist || FALLBACK_CHECKLIST)] },
    atlas: {
      title: a.title || "Things worth knowing", intro: a.intro || "",
      states: a.states?.length === 3 ? [...a.states] : ["Not yet", "Understood", "Applied"],
      sortByYear: !!a.sortByYear, link: { label: a.link?.label || "search", template: a.link?.template || "https://www.google.com/search?q={name}" },
    },
  };
}

/** Pack content in state shape: user-progress fields added and switched off. */
export function seedFromPack(pack) {
  const regions = {};
  Object.entries(pack.regions || {}).forEach(([id, r]) => {
    regions[id] = {
      ...clone(r), files: [],
      skills: (r.skills || []).map(s => ({
        group: "", why: "", build: "", notes: "", prereqs: [], status: "locked", progress: 0, files: [], ...clone(s),
        musts: (s.musts || []).map(m => ({ ...m, done: false })),
        sources: (s.sources || []).map(x => ({ url: "", ...x, done: false })),
      })),
    };
  });
  const quests = (pack.quests || []).map(q => ({
    tier: "core", hpw: 3, status: "locked", progress: 0, doneWhen: "", notes: "", repo: "", proves: [], files: [], ...clone(q),
    checklist: (q.checklist || []).map(c => ({ ...c, done: false })),
    sources: (q.sources || []).map(x => ({ url: "", ...x, done: false })),
  }));
  return { regions, quests, atlasDef: { cats: clone(pack.atlas?.cats || []), items: clone(pack.atlas?.items || []) } };
}
const skillIdsOf = regions => Object.values(regions).flatMap(r => (r.skills || []).map(s => s.id));

const PREFS = { theme: "nebula", motion: "", fx: true, sound: false, weekStart: 1, weeklyHours: 10, labels: {}, hiddenTabs: [], gamify: true, starter: true, neverClosed: false };
const BIO = { name: "", title: "", specialization: "", location: "", email: "", statement: "", about: "", focus: "", avatar: "", emblem: "compass", banner: "theme",
  links: [{ label: "GitHub", url: "" }, { label: "Website", url: "" }, { label: "LinkedIn", url: "" }] };

export function base(pack, opts = {}) {
  const months = clampInt(opts.months ?? pack.plan?.months ?? 12, MIN_MONTHS, MAX_MONTHS);
  const pm = pack.plan?.months, pp = pack.plan?.phases;
  const phases = opts.phases || (pp?.length ? pp.map(p => { const [start, end] = scaleWin(p.start, p.end, pm, months); return { name: p.name, start, end }; }) : defaultPhases(months));
  return {
    version: DATA_VERSION, pack: packMeta(pack),
    plan: { start: opts.start || thisMonth(), months, phases },
    regions: {}, quests: [], posts: [], duties: [], weeks: {}, sessions: [], timer: null, atlas: {}, atlasDef: { cats: [], items: [] },
    bio: { ...clone(BIO), title: pack.profile?.title || "", specialization: pack.profile?.specialization || "", focus: pack.profile?.focus || "", ...(opts.bio || {}) },
    prefs: { ...clone(PREFS), weeklyHours: pack.plan?.weeklyHours ?? 10, ...(opts.prefs || {}) },
    meta: { lastExport: "", updated: "", created: new Date().toISOString(), packSkills: [] },
  };
}

export const welcomePost = () => ({
  id: rid("p"), title: "Why I'm learning this, and what I'll have to show for it", date: ymd(new Date()), status: "idea", tags: "plan", url: "", skills: [], quest: "", files: [],
  body: "## Why\n\nThe problem or goal I care about, in two sentences.\n\n## What I'll be able to do\n\n- \n- \n\n## What I'll build or produce\n\n- \n\n## How I'll measure progress\n\nOne finished, visible result per phase.",
});

/** A brand-new profile state from a pack. `opts.months` different from the pack's rescales every window. */
export function fresh(pack, opts = {}) {
  const o = base(pack, opts), sd = seedFromPack(pack), from = pack.plan?.months || o.plan.months, to = o.plan.months;
  Object.values(sd.regions).forEach(r => r.skills.forEach(s => { [s.start, s.end] = scaleWin(s.start, s.end, from, to); }));
  sd.quests.forEach(q => { [q.start, q.end] = scaleWin(q.start, q.end, from, to); });
  o.regions = sd.regions;
  o.quests = sd.quests.map(q => ({ ...q, seedProves: [...q.proves] }));
  o.atlasDef = sd.atlasDef;
  o.posts = [welcomePost()];
  o.meta.packSkills = skillIdsOf(sd.regions);
  return normalize(o, pack);
}

/** Make any state structurally valid. Idempotent. */
export function normalize(o, pack) {
  o.plan = { start: thisMonth(), ...(o.plan || {}) };
  const M = (o.plan.months = clampInt(o.plan.months ?? 36, MIN_MONTHS, MAX_MONTHS)); // saves without a length come from the fixed 36-month original
  const clampM = n => clampInt(n, 1, M);
  if (!Array.isArray(o.plan.phases) || !o.plan.phases.length)
    o.plan.phases = pack?.plan?.months === M && pack.plan.phases?.length ? clone(pack.plan.phases) : defaultPhases(M);
  o.plan.phases = o.plan.phases.map(p => { const start = clampM(p.start); return { name: String(p.name || "Phase"), start, end: Math.max(start, clampM(p.end)) }; });

  const ids = new Set();
  o.regions = o.regions || {};
  Object.values(o.regions).forEach(r => {
    r.skills = r.skills || []; r.files = r.files || [];
    r.skills.forEach(s => {
      if (!(s.start >= 1)) { s.start = 1; s.end = M; s.cont = true; }
      delete s.phase;
      s.start = clampM(s.start); s.end = s.cont ? M : Math.max(s.start, clampM(s.end));
      s.sources = s.sources || []; s.files = s.files || []; s.musts = s.musts || []; s.prereqs = s.prereqs || [];
      if (s.hpw == null) s.hpw = 2; if (s.why == null) s.why = ""; if (!s.status) s.status = "locked";
      ids.add(s.id);
    });
  });
  Object.values(o.regions).forEach(r => r.skills.forEach(s => (s.prereqs = s.prereqs.filter(i => ids.has(i) && i !== s.id))));
  o.quests = (o.quests || []).map(q => ({ checklist: [], files: [], sources: [], proves: [], notes: "", doneWhen: "", repo: "", tier: "core", status: "locked", progress: 0, hpw: 3, ...q }));
  o.quests.forEach(q => { q.start = clampM(q.start); q.end = Math.max(q.start, clampM(q.end)); q.proves = q.proves.filter(i => ids.has(i)); });
  o.posts = (o.posts || []).map(p => ({ skills: [], quest: "", files: [], ...p }));
  o.posts.forEach(p => (p.skills = p.skills.filter(i => ids.has(i))));
  o.duties = (o.duties || []).map(d => ({ skills: [], files: [], ...d }));
  o.duties.forEach(d => (d.skills = d.skills.filter(i => ids.has(i))));
  o.sessions = o.sessions || []; o.weeks = o.weeks || {}; o.atlas = o.atlas || {};

  if (!o.atlasDef) o.atlasDef = pack ? seedFromPack(pack).atlasDef : { cats: [], items: [] };
  const ad = o.atlasDef; ad.cats = ad.cats || []; ad.items = ad.items || [];
  const catIds = new Set(ad.cats.map(c => c.id));
  ad.items.forEach(a => { if (!catIds.has(a.cat)) { if (!catIds.has("other")) { ad.cats.push({ id: "other", label: "Other" }); catIds.add("other"); } a.cat = "other"; } if (a.skill && !ids.has(a.skill)) a.skill = ""; });

  o.prefs = { ...clone(PREFS), ...(o.prefs || {}) };
  if (!o.prefs.labels || typeof o.prefs.labels !== "object") o.prefs.labels = {};
  if (!Array.isArray(o.prefs.hiddenTabs)) o.prefs.hiddenTabs = [];
  o.bio = { ...clone(BIO), ...(o.bio || {}) };
  o.meta = { lastExport: "", updated: "", packSkills: [], ...(o.meta || {}) };
  if (!o.pack && pack) o.pack = packMeta(pack);
  o.version = DATA_VERSION;
  return o;
}

/** Bring a saved or imported state (any version since v3) into the current shape for `pack`. */
export function migrate(input, pack) {
  const { app, saved, exported, attachments, ...rest } = input || {};
  const b = base(pack, { months: rest.plan?.months ?? 36 });
  const o = {
    ...b, ...rest,
    plan: { ...b.plan, ...(rest.plan || {}) }, bio: { ...b.bio, ...(rest.bio || {}) },
    prefs: { ...b.prefs, ...(rest.prefs || {}) }, meta: { ...b.meta, ...(rest.meta || {}) },
  };
  if (!rest.plan?.phases) delete o.plan.phases;
  if (!rest.pack) o.pack = { ...packMeta(pack), revision: 0 }; // older save: merge the pack's content into it once
  normalize(o, pack);
  return finish(o, pack);
}

export function finish(o, pack) {
  if (pack && o.pack?.id === pack.id && (o.pack.revision || 0) < (pack.revision || 1)) { upgradeContent(o, pack); normalize(o, pack); }
  return o;
}

/* ---------- pack upgrades: new content in; the user's progress, notes, files and own items kept ---------- */
const norm = t => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const words = t => new Set(String(t || "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));
export function sim(a, b) {
  const A = words(a), B = words(b); if (!A.size || !B.size) return 0;
  let k = 0; A.forEach(w => { if (B.has(w)) k++; }); return k / Math.min(A.size, B.size);
}
/** New list from the pack, carrying `done` over by id or text; keeps user-made items and anything already done. */
export function mergeList(seedList, oldList, isUser, opt = {}) {
  const byId = {}, byT = {};
  (oldList || []).forEach(x => { byId[x.id] = x; byT[norm(x.title || x.text)] = x; });
  const used = new Set();
  const out = seedList.map(n => { const o = byId[n.id] || byT[norm(n.title || n.text)]; if (o && !used.has(o)) { used.add(o); return { ...n, done: !!o.done }; } return n; });
  if (opt.fuzzy) (oldList || []).forEach(x => {
    if (used.has(x) || !x.done || isUser(x)) return;
    let best = null, bs = 0;
    out.forEach(n => { if (n.done) return; const v = sim(x.text, n.text); if (v > bs) { bs = v; best = n; } });
    if (best && bs >= 0.5) { best.done = true; used.add(x); }
  });
  (oldList || []).forEach(x => { if (!used.has(x) && (isUser(x) || x.done)) out.push(x); });
  return out;
}
const userItem = x => !isContentId(x.id);
export function hasUserData(s, o) {
  return (s.progress || 0) > 0 || (s.status && s.status !== "locked") || (s.files || []).length || (s.sources || []).some(x => x.done) || (s.musts || []).some(x => x.done)
    || String(s.notes || "").trim() || (o.sessions || []).some(x => x.ref === "s:" + s.id);
}
export function upgradeContent(o, pack) {
  const seed = seedFromPack(pack), loc = {}, seedIds = new Set(), prev = new Set(o.meta?.packSkills || []);
  const from = pack.plan?.months || o.plan.months, to = o.plan.months;
  Object.entries(o.regions).forEach(([id, r]) => (r.skills || []).forEach(s => (loc[s.id] = { rid: id, s })));
  Object.entries(seed.regions).forEach(([id, sr]) => {
    const r = (o.regions[id] ||= { skills: [], files: [] });
    const { skills, files, ...meta } = sr; Object.assign(r, meta);
    const list = [];
    skills.forEach(ns => {
      seedIds.add(ns.id);
      [ns.start, ns.end] = scaleWin(ns.start, ns.end, from, to);
      const ex = loc[ns.id]; if (!ex) { list.push(ns); return; }
      const s = ex.s, fromR = o.regions[ex.rid];
      if (fromR && fromR !== r) fromR.skills = fromR.skills.filter(x => x !== s);
      Object.assign(s, { name: ns.name, tier: ns.tier, start: ns.start, end: ns.end, hpw: ns.hpw, why: ns.why, prereqs: ns.prereqs, build: ns.build, group: ns.group });
      if (ns.cont) s.cont = true; else delete s.cont;
      s.musts = mergeList(ns.musts, s.musts, userItem, { fuzzy: true });
      s.sources = mergeList(ns.sources, s.sources, userItem);
      list.push(s);
    });
    r.skills = [...list, ...(r.skills || []).filter(s => !list.includes(s))];
  });
  // a skill the previous pack revision had, the new one dropped, and the user never touched: remove it
  Object.values(o.regions).forEach(r => { r.skills = (r.skills || []).filter(s => seedIds.has(s.id) || !prev.has(s.id) || hasUserData(s, o)); });

  const byQ = {}; o.quests.forEach(q => (byQ[q.id] = q));
  seed.quests.forEach(nq => {
    [nq.start, nq.end] = scaleWin(nq.start, nq.end, from, to);
    const q = byQ[nq.id];
    if (!q) { o.quests.push({ ...nq, seedProves: [...nq.proves] }); return; }
    const mine = (q.proves || []).filter(x => !(q.seedProves || []).includes(x));
    Object.assign(q, { code: nq.code, name: nq.name, tier: nq.tier, start: nq.start, end: nq.end, hpw: nq.hpw, doneWhen: nq.doneWhen, proves: [...new Set([...nq.proves, ...mine])], seedProves: [...nq.proves] });
    q.checklist = mergeList(nq.checklist, q.checklist, userItem);
  });
  o.quests.sort((a, b) => String(a.code).localeCompare(String(b.code)));

  const ad = (o.atlasDef ||= { cats: [], items: [] });
  const packCats = new Set(seed.atlasDef.cats.map(c => c.id)), packItems = new Set(seed.atlasDef.items.map(a => a.id));
  const oldItems = {}; (ad.items || []).forEach(a => (oldItems[a.id] = a));
  const keptItems = (ad.items || []).filter(a => !packItems.has(a.id) && (userItem(a) || (o.atlas || {})[a.id]));
  ad.items = [...seed.atlasDef.items, ...keptItems];
  const used = new Set(ad.items.map(a => a.cat));
  ad.cats = [...seed.atlasDef.cats, ...(ad.cats || []).filter(c => !packCats.has(c.id) && used.has(c.id))];

  o.pack = packMeta(pack);
  o.meta.packSkills = [...seedIds];
  return o;
}

/** Re-plan to a new length: every window and phase is stretched or squeezed proportionally. */
export function rescale(o, to) {
  const from = o.plan.months; to = clampInt(to, MIN_MONTHS, MAX_MONTHS);
  if (from === to) return o;
  Object.values(o.regions).forEach(r => (r.skills || []).forEach(s => { [s.start, s.end] = scaleWin(s.start, s.end, from, to); if (s.cont) s.end = to; }));
  o.quests.forEach(q => { [q.start, q.end] = scaleWin(q.start, q.end, from, to); });
  o.plan.phases = o.plan.phases.map(p => { const [start, end] = scaleWin(p.start, p.end, from, to); return { ...p, start, end }; });
  o.plan.months = to;
  return o;
}

/** For a backup with no pack information: the built-in pack whose skills overlap it most (at least half), else null. */
export function detectPack(o, packs) {
  const mine = new Set(skillIdsOf(o.regions || {}).filter(isContentId)); if (!mine.size) return null;
  let best = null, bs = 0;
  packs.forEach(p => { const ids = skillIdsOf(p.regions || {}); if (!ids.length) return; const k = ids.filter(i => mine.has(i)).length / mine.size; if (k > bs) { bs = k; best = p; } });
  return bs >= 0.5 ? best : null;
}
