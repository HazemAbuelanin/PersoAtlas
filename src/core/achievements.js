/* Trophies and unlock events, computed purely from the state, so any change, from anywhere, is picked up.
   Descriptions may contain {skill} {skills} {quest} {quests} {region} {atlas} {post} {posts} {duty};
   the UI fills them with the user's own vocabulary. */

export function longestStreak(sessions) {
  const days = [...new Set((sessions || []).map(x => x.date))].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    const t = new Date(d + "T12:00:00");
    run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  return best;
}

/** Everything the trophies look at, in one pass. */
export function tally(S) {
  const skills = Object.values(S.regions || {}).flatMap(r => r.skills || []);
  const regions = Object.values(S.regions || {});
  const atlasVals = Object.values(S.atlas || {});
  return {
    regions: regions.length,
    skills: skills.length,
    started: skills.filter(s => s.status === "active" || s.status === "mastered" || (s.progress || 0) > 0).length,
    mastered: skills.filter(s => s.status === "mastered").length,
    conquered: regions.filter(r => (r.skills || []).length && r.skills.every(s => s.status === "mastered")).length,
    quests: (S.quests || []).filter(q => q.status === "done").length,
    musts: skills.reduce((a, s) => a + (s.musts || []).filter(m => m.done).length, 0),
    atlasMarked: atlasVals.filter(v => v > 0).length,
    atlasTop: atlasVals.filter(v => v === 2).length,
    atlasOwn: (S.atlasDef?.items || []).filter(a => !String(a.id).includes("-")).length,
    sessions: (S.sessions || []).length,
    hours: (S.sessions || []).reduce((a, x) => a + (+x.min || 0), 0) / 60,
    streak: longestStreak(S.sessions),
    weeksCleared: Object.values(S.weeks || {}).filter(w => (w.goals || []).length >= 3 && w.goals.every(g => g.done)).length,
    published: (S.posts || []).filter(p => p.status === "published").length,
    duties: (S.duties || []).length,
    exported: S.meta?.lastExport ? 1 : 0,
    avatar: S.bio?.avatar ? 1 : 0,
  };
}

const T = (id, name, desc, tier, icon, key, goal) => ({ id, name, desc, tier, icon, key, goal });
export const TROPHIES = [
  T("cartographer", "Cartographer", "Create your first {region}", "bronze", "map", "regions", 1),
  T("first-step", "First Step", "Add your first {skill}", "bronze", "compass", "skills", 1),
  T("awakening", "Awakening", "Start working on a {skill}", "bronze", "bolt", "started", 1),
  T("adept", "Adept", "Master a {skill}", "silver", "star", "mastered", 1),
  T("polymath", "Polymath", "Master 10 {skills}", "silver", "atom", "mastered", 10),
  T("sage", "Sage", "Master 25 {skills}", "gold", "crown", "mastered", 25),
  T("conqueror", "Conqueror", "Master every {skill} in a {region}", "gold", "shield", "conquered", 1),
  T("quest-1", "Mission Accomplished", "Complete a {quest}", "silver", "trophy", "quests", 1),
  T("quest-5", "Hero", "Complete 5 {quests}", "gold", "trophy", "quests", 5),
  T("scholar", "Scholar", "Check off 50 must-knows", "silver", "book", "musts", 50),
  T("spark", "Spark", "Mark your first {atlas} entry", "bronze", "eye", "atlasMarked", 1),
  T("curator", "Curator", "Add an entry of your own to the {atlas}", "bronze", "feather", "atlasOwn", 1),
  T("encyclopedist", "Encyclopedist", "Mark 50 {atlas} entries", "gold", "book", "atlasMarked", 50),
  T("zone", "In the Zone", "Log your first focus session", "bronze", "clock", "sessions", 1),
  T("dedicated", "Dedicated", "Log 10 hours of focus", "silver", "clock", "hours", 10),
  T("centurion", "Centurion", "Log 100 hours of focus", "gold", "clock", "hours", 100),
  T("warming-up", "Warming Up", "Study 3 days in a row", "bronze", "flame", "streak", 3),
  T("on-fire", "On Fire", "Study 7 days in a row", "silver", "flame", "streak", 7),
  T("unstoppable", "Unstoppable", "Study 30 days in a row", "gold", "flame", "streak", 30),
  T("clean-sweep", "Clean Sweep", "Finish every goal of a week (3 or more)", "silver", "star", "weeksCleared", 1),
  T("storyteller", "Storyteller", "Publish your first {post}", "bronze", "feather", "published", 1),
  T("chronicler", "Chronicler", "Publish 10 {posts}", "gold", "feather", "published", 10),
  T("professional", "Professional", "Log your first {duty}", "bronze", "shield", "duties", 1),
  T("safekeeper", "Safekeeper", "Export your first backup", "bronze", "save", "exported", 1),
  T("identity", "True Colours", "Add a profile picture", "bronze", "heart", "avatar", 1),
  T("level-5", "Rising Star", "Reach level 5", "silver", "star", "level", 5),
  T("level-10", "Specialist", "Reach level 10", "gold", "crown", "level", 10),
  T("level-20", "Living Legend", "Reach level 20", "gold", "crown", "level", 20),
];

/** [current, goal] for every trophy. */
export function trophyProgress(S, level) {
  const t = { ...tally(S), level };
  return TROPHIES.map(x => ({ ...x, cur: Math.min(x.goal, Math.floor(t[x.key] || 0)), done: (t[x.key] || 0) >= x.goal }));
}

/** Every unlock key the state currently earns: trophies plus per-item moments. */
export function unlockKeys(S, level) {
  const keys = new Map();
  trophyProgress(S, level).forEach(x => { if (x.done) keys.set("t:" + x.id, { kind: "trophy", major: x.tier !== "bronze", icon: x.icon, title: x.name, desc: x.desc, tier: x.tier }); });
  Object.entries(S.regions || {}).forEach(([rid, r]) => {
    const sk = r.skills || [];
    sk.forEach(s => {
      if (s.status === "active" || s.status === "mastered" || (s.progress || 0) > 0) keys.set("a:" + s.id, { kind: "skill-start", icon: "bolt", title: s.name, desc: "{Skill} unlocked" });
      if (s.status === "mastered") keys.set("m:" + s.id, { kind: "skill-master", major: true, icon: "star", title: s.name, desc: "{Skill} mastered" });
    });
    if (sk.length && sk.every(s => s.status === "mastered")) keys.set("r:" + rid, { kind: "region", major: true, icon: "crown", title: r.name, desc: "{Region} conquered" });
  });
  (S.quests || []).forEach(q => { if (q.status === "done") keys.set("q:" + q.id, { kind: "quest", major: true, icon: "trophy", title: `${q.code ? q.code + " · " : ""}${q.name}`, desc: "{Quest} complete" }); });
  return keys;
}
