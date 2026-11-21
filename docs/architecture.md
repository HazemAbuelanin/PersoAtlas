# Architecture

PersoAtlas is a single-page app written in plain JavaScript ES modules. There is no framework and no runtime dependency. Vite (with `vite-plugin-singlefile`) inlines code, styles, fonts and the built-in Blank map into **one `index.html`** that runs from a web server, from GitHub Pages, or straight from disk.

## Source map

```
src/
├─ main.js                 boot: splash → profile → wire the page → render
├─ styles.css              design system: tokens per theme, components, game layer, motion
├─ core/                   no DOM
│  ├─ model.js             the data model: fresh / normalize / migrate / upgradeContent / rescale (pure, unit-tested)
│  ├─ achievements.js      trophies and unlock events computed from state (pure, unit-tested)
│  ├─ state.js             the live state S of the active profile, plan length M, phases
│  ├─ profiles.js          profile registry (several atlases per browser)
│  ├─ packs.js             built-in and imported content packs
│  ├─ labels.js            vocabulary: user wording → pack wording → defaults
│  ├─ config.js            fixed enums, themes, banners, ranks
│  ├─ plan.js, query.js, util.js
├─ storage/                localStorage save, IndexedDB attachments, folder sync, backup import/export
├─ ui/                     nav + HUD, settings drawer, onboarding, splash, game layer (game.js), icons, attachments, timer
└─ views/                  one file per tab: now, inventory, quests, roadmap, atlas, blog, duties, bio
scripts/                   pack compiler + validator (YAML → JSON)
schema/pack.schema.json    the pack contract
packs/blank/               the only built-in pack
tests/unit, tests/e2e      Vitest and Playwright
```

## Data

Each profile has one state object `S` (documented at the top of `core/model.js`), saved as JSON under `persoatlas.p.<profileId>` in `localStorage`. Attachments are blobs in the IndexedDB database `persoatlas-<profileId>`; the state only stores references. The profile list (with a tiny snapshot for the splash screen) is under `persoatlas.profiles`.

`S` is a single stable object. Replace its contents with `setState()`; never rebind it.

## Packs and upgrades

A pack is compiled by `scripts/pack-lib.mjs` from YAML into the shape in `schema/pack.schema.json`. A profile stores a copy of its pack's settings (`S.pack`), so it keeps working even if the pack file isn't available.

When a pack's `revision` is higher than the profile's, `upgradeContent()` merges it in: content updates by ID, the user's progress, notes and files are kept, and items the user created themselves (IDs without a dash) are never touched.

## The game layer

`core/achievements.js` computes, from the state alone, every "unlock key" the user has earned: trophies (`t:…`) and moments such as a skill started (`a:…`), mastered (`m:…`), a region conquered (`r:…`) or a quest completed (`q:…`). After each HUD render, `ui/game.js → checkProgress()` diffs that set against `S.meta.unlocked`, celebrates only what's new, and records it, so nothing ever replays. Level-ups are detected from the XP formula in `ui/nav.js`.

All motion is gated by `html[data-motion=full]`. The animated background, particles and sound each have their own switch.

## Theming

Every color is a CSS custom property. A theme (`html[data-theme=…]`) is a token set at the top of `styles.css`. To add one, add a token block there and an entry in `THEMES` in `core/config.js`.

## Testing

- `npm test`: Vitest. Model, migrations, upgrades, achievements and the pack validator.
- `npm run test:e2e`: Playwright drives the built single file in Chrome: onboarding, every tab, pack import, game moments, atlas editing, backup round trip. Any console error fails the run.
- `npm run check`: everything, as CI runs it.
