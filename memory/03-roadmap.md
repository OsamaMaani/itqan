# 03 — Roadmap

Stages in build order. `status.json` holds task-level status; this file holds intent.

## Stage 0 — Foundation ✅
Scaffold, data model, versioned persistence, PWA, tests, CI, Pages deploy, memory system.
**Done when:** the app installs, works offline, and `npm run ci:check` passes in CI.

## Stage 1 — Daily-use MVP ✅
Today, Plan (week + inbox, drag between days), Habits (streaks, heatmaps, backfill), Goals
(numeric and milestone, pace), Focus timer, Insights, Weekly review, Settings (areas, backup),
onboarding with the starter routine, command bar with natural-language quick add, XP / levels /
achievements, celebrations.
**Done when:** The owner can run their whole day from it.

## Stage 2 — Shaped by real use (in progress)
Done so far: local no-server app (ADR-012); Memories, Ideas, Reminders with desktop
notifications (ADR-013/014/015); Projects (ADR-019) and Connections (ADR-018).

Driven by the owner's first one to two weeks of feedback. Candidates, in rough priority:
- Publish to GitHub and turn on Pages (S2-01).
- Recurring tasks — "every Monday", "every day" for things that are not habits (S2-02).
- Reorder tasks by drag within a day (S2-03).
- Skip/excuse a habit day (travel, illness) without breaking the streak (S2-04).
- Reminders at chosen times via notifications (S2-05).
- Code-split pages to cut first-load size (S2-06).
- ~~Arabic interface with RTL (S2-07)~~ — done 2026-10-17 as five languages (ADR-024).

## Stage 3 — Learning companions
Purpose-built trackers for what the owner actually studies:
- **Quran revision map** — the 30 juz (or pages) with last-revised dates and a spaced-revision
  suggestion for what to revise today (Q4 decides the unit).
- **Reading list** — books with page counts, currently-reading, finished shelf; feeds goals.
- **Courses** — modules/lessons checklist per course; feeds goals.
- **French** — vocabulary review and oral-presentation practice log.

## Stage 4 — Sync and other users (sync built 2026-10-16)
Sync between the owner's devices is built (ADR-016, ADR-017). Other users would need accounts and
per-user storage — not planned.
Accounts + sync of the same `Data` document across devices; then other users. Only when the owner
wants to use it on two devices or share it (Q3). See `01-architecture.md` → path to sync.

## Stage 5 — Native wrappers (only if needed)
Tauri desktop or Capacitor mobile builds, if the PWA's limits (e.g. background notifications on
iOS) actually get in the way.
