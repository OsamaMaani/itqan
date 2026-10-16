# 07 — Data Model

Source of truth: `src/lib/types.ts`. This file explains the *why* behind the shapes and the
procedure for changing them.

## The document

Everything persisted is one `Data` object under `localStorage["itqan-store"]`, wrapped by
Zustand as `{ state: Data, version: SCHEMA_VERSION }`.

| Field | Shape | Notes |
|---|---|---|
| `areas` | `Area[]` | Deleting an area nulls references; nothing else is deleted with it |
| `tasks` | `Task[]` | `date: null` = Inbox. `doneAt` drives XP day and the review |
| `habits` | `Habit[]` | `schedule` + `target` + `unit` |
| `habitLogs` | `{ [habitId]: { [DateKey]: amount } }` | A map, not an array: O(1) per day, compact. Amount 0 = key removed |
| `goals` | `Goal[]` | `startValue` = progress before tracking began; milestones inline |
| `goalLogs` | `GoalLog[]` | Check-ins; current value = startValue + Σ amounts |
| `focusSessions` | `FocusSession[]` | Only *finished* focus time is stored |
| `timer` | `ActiveTimer \| null` | Persisted so a running timer survives reload; `endsAt` is epoch ms |
| `dayNotes` | `{ [DateKey]: DayNote }` | Intention, mood, reflection |
| `reviews` | `{ [weekStart]: WeeklyReview }` | Keyed by the week's first DateKey |
| `memories` | `Memory[]` | `date` = when it happened; text, emoji, tags, favourite (ADR-014) |
| `ideas` | `Idea[]` | `status` new → exploring → doing → done / dropped; `taskIds`, `goalId` (ADR-015) |
| `projects` | `Project[]` | Status, dates, area, goal, notes, links; tasks join via `Task.projectId` (ADR-019) |
| `projectUpdates` | `ProjectUpdate[]` | Status posts on a project, optionally with a manual progress (ADR-020) |
| `contacts` | `Contact[]` | Circle, rhythm (`cadenceDays`), birthday `YYYY-MM-DD` or `MM-DD`, `birthdayReminderId` (ADR-018) |
| `interactions` | `Interaction[]` | Check-ins with a person: kind, date, note |
| `reminders` | `Reminder[]` | `date` = first/original occurrence; `time` null = all-day; `repeat`; `alerts` = minutes before (ADR-013) |
| `settings` | `Settings` | Includes `onboarded`, `lastBackupAt` |

## The sync document (ADR-016)

`itqan-sync.json` in the private repo is an envelope
`{ app: 'itqan-sync', v: 1, kdf: { alg, iterations, salt }, iv, data }` whose decrypted `data` is
`{ app: 'itqan-sync-doc', schemaVersion, entities, meta, updatedAt, device }`. `entities` keys are
listed in `src/lib/sync/entities.ts`; `meta[key] = { u: epochMs, d?: 1 }`.

**Schema changes and sync:** a remote document with an older `schemaVersion` is rebuilt into
`Data`, run through `migrate()`, and split again — so every migration step also upgrades synced
data. A newer remote version stops sync with a message until this device is updated. A migration
that renames an entity key must also carry its `meta` stamp across.

## Why some things are *not* stored

XP, levels, achievements, streaks, completion rates and goal progress are derived (ADR-005,
ADR-006). Storing them would let them drift from the history they summarise.

## Changing a persisted shape — the procedure

1. Edit the type in `types.ts`, and its default in `seed.ts` (`emptyData` / `DEFAULT_SETTINGS`).
2. Increment `SCHEMA_VERSION` in `migrations.ts` and add `steps[old] = (d) => …` that converts
   old data **without dropping anything**.
3. Add a test in `src/lib/__tests__/migrations.test.ts` feeding old-shaped data through
   `migrate(old, oldVersion)` and asserting the new shape *and* that existing records survive.
4. `normalize()` must still produce a complete `Data` from partial input.
5. Backups from the old version must import (they pass through the same `migrate`).

Current version: **4**. History: 1 = initial; 2 = `memories`, `ideas`, `reminders`; 3 = `projects`,
`contacts`, `interactions`, `Task.projectId`, `Reminder.contactId`, `Reminder.countYears`; 4 = `Task.stage`,
`Task.blocked`, `Project.progressMode/manualProgress/view/pinned`, `projectUpdates` (all 2026-10-16).
