# Writing a content pack

A **pack** is a ready-made map: regions of skills, quests, atlas entries, a plan length, and optionally your own vocabulary. Someone who imports it gets a fully laid-out atlas they can then make their own.

Packs are plain YAML in a folder. A build step validates them and turns them into one `.json` file that anyone can import.

## Quick start

```bash
cp -r docs/pack-template ~/my-packs/my-pack      # keep packs anywhere you like
# edit the files, then:
node scripts/build-packs.mjs --dir ~/my-packs     # validates and writes ~/my-packs/dist/my-pack.json
```

In the app: **first screen → Start from a pack file** (or System → New profile), pick `my-pack.json`.

## Folder layout

```
my-pack/
├─ pack.yaml            # manifest: name, plan, vocabulary, atlas settings
├─ regions/
│  ├─ basics.yaml       # one region (file name = region id unless you set `id:`)
│  └─ practice.yaml
├─ quests.yaml          # optional: a list of quests
└─ atlas/
   └─ ideas.yaml        # optional: one atlas category per file
```

## `pack.yaml`

```yaml
id: my-pack                 # lowercase, must equal the folder name
name: My Pack
summary: One line shown under the name
description: A paragraph about who it's for and what they'll be able to do.
version: 1.0.0              # for humans
revision: 1                 # bump on EVERY content change: that's what triggers upgrades
license: CC-BY-SA-4.0
authors: [Your Name]
audience: First-year students
profile:                    # suggested defaults for the user's card
  title: Data analyst
plan:
  months: 12                # 1–240; users can stretch or squeeze it later
  weeklyHours: 8
  phases:                   # optional; four equal phases otherwise
    - { name: "Phase 1 · Foundations", start: 1, end: 3 }
    - { name: "Phase 2 · Practice", start: 4, end: 12 }
labels:                     # optional: rename the app's vocabulary for this pack
  quests: Projects
  quest: Project
atlas:
  title: Methods worth knowing
  intro: Mark each one ◐ understood or ✓ used.
  states: [Not yet, Understood, Used]   # exactly three
  sortByYear: false
  link: { label: search, template: "https://www.google.com/search?q={name}" }   # used when an entry has no url
defaults:
  build: What a learner builds to prove a new skill
  checklist: [Draft, Feedback, Final]   # default deliverables for new quests
```

Label keys: `now inv quests map atlas blog duties bio region regions skill quest post duty`.

## A region

```yaml
name: Basics
code: BA                    # up to 3 characters, shown on the rail
color: "#5b8cff"
section: Foundations        # optional heading that groups regions in the rail
desc: One line under the region title
exit: What someone can do when the whole region is mastered
never:                      # "never miss" principles shown at the top of the region
  - Practise a little every day.
skills:
  - id: basics-reading      # required; MUST contain a dash (see "IDs" below)
    name: Reading
    group: Core             # optional sub-heading inside the region
    tier: foundation        # foundation | core | specialist | mastery
    start: 1                # month window within the plan
    end: 3
    cont: false             # true = ongoing from `start` to the end of the plan
    hpw: 2                  # planned hours per week
    why: Why this matters, in one sentence.
    prereqs: [basics-alphabet]
    build: What to make to prove it
    musts:                  # the concepts that define mastery; checking them drives progress
      - Short plain sentences are fine
      - { id: basics-reading-m-1, text: Or objects with a fixed id }
    sources:
      - { type: book, title: "A Good Book — Author", url: "https://…" }
```

Source types: `book course video paper repo tool community project note`.

## Quests

```yaml
- id: q-first-project
  code: Q01
  name: My first project
  tier: core
  start: 2
  end: 4
  hpw: 3
  doneWhen: The measurable bar that ends it
  proves: [basics-reading]          # skill ids
  checklist: [Plan written, Built, Shared]
```

## Atlas

```yaml
# atlas/ideas.yaml (the file name is the category id unless you set `id:`)
label: Key ideas
order: 0
items:
  - name: Spaced repetition
    year: "1885"                    # optional
    idea: Review just before you would forget.
    skill: basics-reading           # optional link to a skill
    url: https://…                  # optional; otherwise the pack's link template is used
```

## IDs (read this before publishing)

- Content IDs (skills, quests, must-knows, sources, atlas items) **must contain a dash**. IDs created inside the app never do. That's how an upgrade tells your content (safe to update) from the user's own additions (always kept).
- **Never change an ID** after publishing. Rename the `name`, not the `id`. A changed ID looks like "removed + added" and the user loses that item's progress.
- Plain-string must-knows, checklist items and sources get an ID generated from their text. Editing the text changes the ID; progress usually survives through text matching, but give important items a fixed `id`.

## Publishing an update

1. Edit the YAML.
2. Bump `revision` (and `version` if you like).
3. Build and share the new `.json`.

Users load it with **System → Update from pack file**. New skills, quests and atlas entries appear; renamed things update; skills you removed disappear only if the user never touched them; progress, notes, files and the user's own items are kept. A copy of the pre-update data is kept so they can roll back.

## Validation

The build refuses packs with schema errors, duplicate IDs, unknown prerequisites/skills/categories, windows outside the plan, or a folder/id mismatch. The full schema is in [`schema/pack.schema.json`](../schema/pack.schema.json).
