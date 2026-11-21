# Contributing to PersoAtlas

Thanks for helping. Every kind of contribution counts: bug reports, ideas, design, accessibility fixes, themes, translations, documentation and code.

## Ground rules

- **Privacy first.** The app must never send data anywhere or load anything from the network. No analytics, no CDNs, no external fonts.
- **The app ships empty.** The repository contains no curriculum. Packs are shared as separate files (see [docs/writing-a-pack.md](docs/writing-a-pack.md)). Tests use the synthetic fixture in `tests/fixtures/`.
- **Never lose user data.** Changes to the data model need a migration in `core/model.js` and a unit test.
- **Respect calm.** New motion goes behind `html[data-motion=full]`; new sound behind the Sound switch.

## Setup

```bash
npm install
npx playwright install chromium   # once, for end-to-end tests
npm run dev                       # http://localhost:5173
```

## Before you open a pull request

```bash
npm run check    # lint · validate packs · unit tests · build · end-to-end tests
```

- Keep PRs focused; describe what changed and why, with a screenshot for UI changes.
- Add or update tests for behaviour changes.
- If you change the UI, run `npm run screenshots` and commit updated images in `docs/images` when they change visibly.

## Where things live

See [docs/architecture.md](docs/architecture.md) for the source map, data model, upgrade rules and the game layer.

## Good first contributions

- A new theme (a token block in `src/styles.css` + an entry in `THEMES`)
- New emblems (an SVG path in `src/ui/icons.js`)
- New trophies (an entry in `TROPHIES` in `src/core/achievements.js`, with a test)
- Accessibility and keyboard-navigation improvements
- Translations (an i18n layer is planned; open an issue to discuss)

## Reporting bugs

Open an issue with the browser and version, what you did, what you expected and what happened. **Don't attach your backup file**; it contains your personal data. Describe the shape of the problem instead.
