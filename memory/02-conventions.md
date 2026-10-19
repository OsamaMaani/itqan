# 02 — Conventions

Written for a codebase built largely with AI by one person: **repetition over cleverness**.
Every page should look like every other page so that a session pointed at one file can produce
correct code without reading the whole app.

## Where things go

| Kind of code | Location | Rule |
|---|---|---|
| Persisted types | `src/lib/types.ts` | The only place a persisted shape is defined |
| State + writes | `src/lib/store.ts` | Every mutation is an action here |
| Migrations | `src/lib/migrations.ts` | One step per schema version, each tested |
| Pure domain logic | `src/lib/{habits,goals,gamification,quickAdd,date}.ts` | No React, no store access; tested |
| Hooks / derived data | `src/lib/hooks.ts` | Memoised reads for components |
| UI primitives | `src/components/ui.tsx` | Card, Button, Input, Modal, ProgressRing… |
| Feature components | `src/components/*.tsx` | Editors, tiles, cards shared by pages |
| Screens | `src/pages/*.tsx` | One file per route; registered in `App.tsx` and `router.ts` |
| Interface text | `src/i18n/<lang>/<screen>.ts` | Every visible string. English is the source; rules in `10-localization.md` |
| Bundled content | `src/content/` | Daily card verses, hadith, wisdom, facts, word packs (ADR-023). Data only |

## Patterns

- **A new screen**: add the route to `ROUTES` in `router.ts`, the page to `PAGES` in `App.tsx`,
  and an entry to `NAV` in `Shell.tsx`. Start the page with `<PageHeader>`.
- **A new persisted field**: `types.ts` → default in `seed.ts` → migration step + test →
  action in `store.ts` → UI. Bump `SCHEMA_VERSION`.
- **A new derived number**: pure function in `lib/`, test first, then use it via a hook.
- **Create/edit forms** are one modal component taking an optional existing entity
  (`TaskEditor`, `HabitEditor`, `GoalEditor`).
- **Optional callbacks** are called after the work, never around it: `const id = add(x); onCreated?.(id)`.
  `onCreated?.(add(x))` skips `add(x)` entirely when there is no callback — it is why "New goal"
  on the Goals page created nothing from the first commit (S2-25). `sourceGuards.test.ts` fails on the pattern.
- **Destructive actions** confirm (`confirm()` for single items, typed `DELETE` for wiping all),
  or offer Undo via toast (task delete).

- **Any visible text**: add it to `src/i18n/en/<screen>.ts` and the four translations, read it
  with `useI18n()` (`tx()` in lib code). Whole sentences with placeholders, plurals for counts,
  `t.d()`/`t.n()` for dates and numbers, logical `ms-/pe-/start-` classes. `10-localization.md`.

## Naming

Read `05-glossary.md` first. Files: `PascalCase.tsx` for components, `camelCase.ts` for lib.
Store actions are verbs (`addTask`, `toggleMilestone`, `setHabitAmount`).

## Styling

Tailwind utility classes using the **semantic tokens** (`bg-surface`, `text-muted`,
`border-border`, `text-accent`…) from `src/index.css`. Never raw hex in components except area
colours (`AREA_HEX`), which are data. Details in `08-design-system.md`.

## Testing policy

Coverage where a silent bug is unrecoverable, not everywhere:

1. **Migrations and backups** — every schema step; backup round-trip; bad files rejected.
2. **Habit maths** — streaks, pending today, unscheduled days, weekly quotas, completion rate.
3. **XP and levels** — derived from history; thresholds.
4. **Quick-add parser** — every token type, and that ordinary words stay in the title, in each
   language (ADR-024).
5. **Daily card content** — selection (`pickForDay`) and content integrity in `daily.test.ts`.
   **Quran and hadith text is never typed by hand**: add the reference, copy the text from the
   source, and run `python3 scripts/verify_daily.py` (word-for-word check; needs the network).
   After adding a verse, `verify_daily.py --write-meanings` regenerates its published French,
   Spanish and Chinese meanings; cut the excerpt by hand if it is a `part` verse.
6. **Translations** — `src/i18n/__tests__/catalogs.test.ts`: every key and plural form in every
   language, placeholders kept, each language's typography, quick-add examples parse, daily-card
   content complete. `I18N_LANGS=fr npx vitest run src/i18n` checks one language.

UI is verified by running it (`npm run dev`), not by snapshot tests.

`npm run ci:check` = dashboard check + `tsc -b` + `vitest run` + `vite build`. It must pass.
