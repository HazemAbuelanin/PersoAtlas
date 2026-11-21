/* The app's vocabulary. Resolution order: the user's own wording (Settings), then the pack's, then these defaults. */
import { S } from "./state.js";

export const LABEL_DEFAULTS = {
  now: "Now", inv: "Inventory", quests: "Quests", map: "Roadmap", atlas: "Atlas", blog: "Blog", duties: "Duties", bio: "Bio",
  region: "Region", regions: "Regions", skill: "Skill", quest: "Quest", post: "Post", duty: "Duty",
};
export const LABEL_KEYS = Object.keys(LABEL_DEFAULTS);
export const LABEL_HELP = {
  now: "Weekly dashboard tab", inv: "Skills tab", quests: "Projects tab", map: "Timeline tab", atlas: "Knowledge index tab",
  blog: "Writing tab", duties: "Work & experience tab", bio: "Profile tab",
  region: "A group of skills (one)", regions: "Groups of skills (many)", skill: "One thing you learn", quest: "One project that proves skills",
  post: "One piece of writing", duty: "One role or engagement",
};
export const LABEL_PRESETS = {
  game: { name: "Game", hint: "Quests, inventory, XP", labels: {} },
  academic: {
    name: "Academic", hint: "Subjects, projects, journal",
    labels: { inv: "Subjects", quests: "Projects", map: "Timeline", atlas: "Knowledge", blog: "Journal", duties: "Experience", bio: "Profile",
      region: "Subject", regions: "Subjects", skill: "Topic", quest: "Project", post: "Entry", duty: "Role" },
  },
  plain: {
    name: "Plain", hint: "Skills, projects, notes",
    labels: { inv: "Skills", quests: "Projects", map: "Plan", atlas: "Library", blog: "Notes", duties: "Work", bio: "Profile",
      region: "Area", regions: "Areas", skill: "Skill", quest: "Project", post: "Note", duty: "Role" },
  },
};

/** Display label, e.g. L("quest") → "Quest" or "Project". */
export const L = k => S.prefs?.labels?.[k] || S.pack?.labels?.[k] || LABEL_DEFAULTS[k] || k;
/** Lower-case label for use inside sentences. */
export const l = k => L(k).toLowerCase();
