/* Fixed vocabulary of the data model. Display names can be changed (see labels.js); these keys can't. */
export const APP_NAME = "PersoAtlas";
export const DATA_VERSION = 4;
export const TIERS = ["foundation", "core", "specialist", "mastery"];
export const TIER_W = { foundation: 1, core: 1.5, specialist: 2, mastery: 3 };
export const TYPES = ["book", "course", "video", "paper", "repo", "tool", "community", "project", "note"];
export const STATUSES = ["locked", "active", "mastered"];
export const QSTAT = ["locked", "active", "done"];
export const DUTY_TYPES = ["company", "research", "freelance", "open-source", "teaching", "volunteer", "study", "other"];
export const DUTY_STATUS = ["ongoing", "completed", "paused"];
export const POST_STATUS = ["idea", "draft", "published"];
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const VIEWS = ["now", "inv", "quests", "map", "atlas", "blog", "duties", "bio"];
/** Tabs a user may hide in Settings (Now and the skill inventory are the core of the app). */
export const HIDEABLE = ["quests", "map", "atlas", "blog", "duties", "bio"];
export const MIN_MONTHS = 1, MAX_MONTHS = 240;
export const FALLBACK_CHECKLIST = ["Finished", "Results written down", "Shared or reviewed"];
/** Themes are token sets in styles.css (html[data-theme]); `sw` is the swatch shown in pickers. */
export const THEMES = {
  nebula: { name: "Nebula", sw: "linear-gradient(135deg,#130b33,#7c5cff 55%,#3ee0ff)" },
  abyss: { name: "Abyss", sw: "linear-gradient(135deg,#03060e,#2f7bff 55%,#38d4ff)" },
  aurora: { name: "Aurora", sw: "linear-gradient(135deg,#020f0d,#10b981 55%,#67e8f9)" },
  ember: { name: "Ember", sw: "linear-gradient(135deg,#110604,#f97316 55%,#fbbf24)" },
  sakura: { name: "Sakura", sw: "linear-gradient(135deg,#12060f,#ec4899 55%,#f9a8d4)" },
  daylight: { name: "Daylight", sw: "linear-gradient(135deg,#ffffff,#c7d2fe 50%,#4f46e5)" },
};
/** Profile-card banners. "theme" follows the active theme's colours. */
export const BANNERS = {
  theme: "linear-gradient(120deg,var(--blue),var(--cyan))",
  dusk: "linear-gradient(120deg,#3b1d72,#c2417d 60%,#f59e0b)",
  ocean: "linear-gradient(120deg,#0b3d91,#0891b2 55%,#5eead4)",
  forest: "linear-gradient(120deg,#052e16,#15803d 55%,#a3e635)",
  ember: "linear-gradient(120deg,#450a0a,#dc2626 50%,#fbbf24)",
  galaxy: "radial-gradient(120% 140% at 20% 0%,#7c3aed,#1e1b4b 55%,#020617)",
  mono: "linear-gradient(120deg,#1f2937,#4b5563 60%,#9ca3af)",
};
/** Rank titles unlocked by level. */
export const RANKS = [[1, "Novice"], [3, "Apprentice"], [6, "Adept"], [10, "Specialist"], [15, "Expert"], [21, "Master"], [28, "Grandmaster"], [36, "Legend"], [50, "Mythic"]];
export const rankOf = lvl => RANKS.filter(([l]) => lvl >= l).at(-1)[1];
