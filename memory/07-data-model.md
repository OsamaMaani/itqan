# 07 — Data Model

Source of truth: `src/lib/types.ts`. This file explains the *why* behind the shapes and the
procedure for changing them.

## The document

Everything persisted is one `Data` object under `localStorage["itqan-store"]`, wrapped by
Zustand as `{ state: Data, version: SCHEMA_VERSION }`.

| Field | Shape | Notes |
|---|---|---|
| `areas` | `Area[]` | Deleting an area nulls references; nothing else is deleted with it |
| `tasks` | `Task[]` | `date: null` = Inbox. `doneAt` drives XP day and the review — read through `dayOf()`, never `toKey(new Date(…))` (ADR-041) |
| `habits` | `Habit[]` | `schedule` + `target` + `unit`; optional `round` `{ size, from, done }` for a counted habit — 604 pages of the Quran — counted from `from` on top of `done`, then it starts again (v15, ADR-038); optional `window` `{ start, end, nights, countOn, countdown }` — when it is done, between prayers (± minutes) or clock times; `schedule` still names the days a check-in counts for, and `countOn` says whether that is the day the window opens or closes (v17, ADR-043) |
| `habitLogs` | `{ [habitId]: { [DateKey]: amount } }` | A map, not an array: O(1) per day, compact. Amount 0 = key removed |
| `goals` | `Goal[]` | `startValue` = progress before tracking began; milestones inline; `link` = follow Training instead of check-ins (v8) |
| `goalLogs` | `GoalLog[]` | Check-ins; current value = startValue + Σ amounts |
| `focusSessions` | `FocusSession[]` | Only *finished* focus time is stored; `habitId` + `habitAmount` = the habit it was for and what it added to that habit's log on its start day (v10, ADR-029) |
| `timer` | `ActiveTimer \| null` | Persisted so a running timer survives reload; `endsAt` is epoch ms |
| `dayNotes` | `{ [DateKey]: DayNote }` | Intention, mood, reflection |
| `reviews` | `{ [weekStart]: WeeklyReview }` | Keyed by the week's first DateKey |
| `memories` | `Memory[]` | `date` = when it happened; text, emoji, tags, favourite (ADR-014) |
| `ideas` | `Idea[]` | `status` new → exploring → doing → done / dropped; `taskIds`, `goalId` (ADR-015) |
| `notes` | `Note[]` | Keep-style: `title`, `body`, checklist `items` (text, done, `taskId`), `color` (area palette or null), `labels`, `pinned` (top of Notes), `onToday` (shown on Today, v14, ADR-036), `archived`, optional area / project / goal, `taskIds` (v13, ADR-035). A line made into a task counts as done once the task is — derived, never written back |
| `projects` | `Project[]` | Status, dates, area, goal, notes, links; tasks join via `Task.projectId` (ADR-019) |
| `projectUpdates` | `ProjectUpdate[]` | Status posts on a project, optionally with a manual progress (ADR-020) |
| `achievements` | `Achievement[]` | Real wins: category, impact, links, optional goal/project, `source` (ADR-022) |
| `contacts` | `Contact[]` | Circle, rhythm (`cadenceDays`), birthday `YYYY-MM-DD` or `MM-DD`, `birthdayReminderId` (ADR-018) |
| `interactions` | `Interaction[]` | Check-ins with a person: kind, date, note |
| `reminders` | `Reminder[]` | `date` = first/original occurrence; `time` null = all-day; `repeat`; `alerts` = minutes before (ADR-013) |
| `exercises` | `Exercise[]` | Equipment, measure (weight / reps / time / distance), muscle, weight step. Deleted only without history, else archived (ADR-027) |
| `routines` | `Routine[]` | Ordered `items` inline: sets, warm-ups, rep range, kg, seconds, metres, rest |
| `program` | `TrainingProgram \| null` | Flexible (default), weekdays or rotation; per-week aim (0 = none in flexible), linked habit. **null until first saved** — synced as `program:main` only then (ADR-027) |
| `workouts` | `Workout[]` | `date` = local day it started; `finishedAt` null = in progress; `items` = a copy of the routine's; `tickedHabitId` |
| `workoutSets` | `WorkoutSet[]` | Own collection so sets from two devices both survive sync. kg, metres, seconds — always; `warmup`; `effort` |
| `pushTargets` | `PushTarget[]` | Devices that get the laptop's alerts pushed: subscription endpoint + keys, the device's own VAPID key pair (private as JWK), `subject`, and `kinds` `{ timer, reminders, checkIns }` — which alerts that device wants, mirroring its own `notify` (v12, ADR-033). Created, updated and removed by that device; synced (v11, ADR-031) |
| `fajrSpans` | `FajrSpan[]` | When a day started at Fajr instead of midnight: `from`/`to` (ISO; `to` null while on) and the `lat`, `lng`, `angle` it was reckoned with. Appended and closed, never deleted or re-opened, so turning the rule on, off or moving it never re-dates the past. On = a span is open. Synced one entity per span, so a stale device cannot wipe one (v16, ADR-041) |
| `settings` | `Settings` | Includes `onboarded`, `lastBackupAt`, `daily` — the daily card's switches, word language and level (ADR-023) — and `language`, the interface language `en`/`ar`/`fr`/`zh`/`es` (schema v7, ADR-024; synced), and `weightUnit` `kg`/`lb`, display only (v8, synced), and `notify` `{ on, timer, reminders, checkIns }` — what this device announces (v11, device-local, ADR-031), and `fajr` `{ place, angle, announce }` — where Fajr is reckoned (null = the device time zone's city), the angle (null = usual there), and the "counted for" notice (v16, synced, ADR-041) — the place and angle are also where every prayer time is reckoned — and `prayer` `{ asr }` (`standard`/`hanafi`) and `habitWindows` `{ showBefore, countdownStart, countdownLeft }` for timed habits (v17, synced, ADR-043). `normalize()` merges `daily`, `notify`, `fajr`, `prayer` and `habitWindows` with their defaults key by key and falls back to `en` for an unknown language |

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

XP, levels, achievements, streaks, streak savers, completion rates and goal progress are derived
(ADR-005, ADR-006, ADR-034). Storing them would let them drift from the history they summarise.

## Changing a persisted shape — the procedure

1. Edit the type in `types.ts`, and its default in `seed.ts` (`emptyData` / `DEFAULT_SETTINGS`).
2. Increment `SCHEMA_VERSION` in `migrations.ts` and add `steps[old] = (d) => …` that converts
   old data **without dropping anything**.
3. Add a test in `src/lib/__tests__/migrations.test.ts` feeding old-shaped data through
   `migrate(old, oldVersion)` and asserting the new shape *and* that existing records survive.
4. `normalize()` must still produce a complete `Data` from partial input.
5. Backups from the old version must import (they pass through the same `migrate`).

Current version: **17**. History: 1 = initial; 2 = `memories`, `ideas`, `reminders`; 3 = `projects`,
`contacts`, `interactions`, `Task.projectId`, `Reminder.contactId`, `Reminder.countYears`; 4 = `Task.stage`,
`Task.blocked`, `Project.progressMode/manualProgress/view/pinned`, `projectUpdates`; 5 = `achievements`
(all 2026-10-16); 6 = `Settings.daily` (2026-10-17); 7 = `Settings.language` (2026-10-17); 8 = Training — `exercises`,
`routines`, `program`, `workouts`, `workoutSets`, `Goal.link`, `Settings.weightUnit` (2026-10-20, ADR-027); 9 = program mode `flexible`, no data change (2026-10-21, ADR-028); 10 = `FocusSession.habitId/habitAmount`, `ActiveTimer.habitId` (2026-10-21, ADR-029); 11 = `pushTargets`, `Settings.notify` (2026-10-23, ADR-031); 12 = `PushTarget.kinds` (2026-10-24, ADR-033); 13 = `notes` (2026-10-26, ADR-035); 14 = `Note.onToday` (2026-10-26, ADR-036); 15 = `Habit.round` (2026-10-27, ADR-038); 16 = `fajrSpans`, `Settings.fajr` (2026-10-28, ADR-041); 17 = `Habit.window`, `Settings.prayer`, `Settings.habitWindows` (2026-10-30, ADR-043).
