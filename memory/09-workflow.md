# 09 — Working Workflow

How every Claude session works on this project. Not advice — the procedure. Same shape as
the earlier project's workflow (ADR-010), sized for a single-user app.

## The roles

| Role | Model | Where it runs |
|---|---|---|
| **Plan & design** | Opus 5.5 | The main session |
| **Implement (standard)** | Sonnet 5.5 | The `itqan-builder` subagent (`.claude/agents/itqan-builder.md`) |
| **Implement (always-Opus list)** | Opus 5.5 | Same agent, dispatched with a model override — or the main session |

Small changes (a copy fix, one component tweak) may be done directly in the main session; the
phases still apply, just compressed.

## The loop

### 1. Orient
Read `CLAUDE.md`, `00-project.md`, `03-roadmap.md`, and `status.json`. Then, by area:

| Touching | Also read |
|---|---|
| Anything persisted | `07-data-model.md`, `02-conventions.md` |
| Streaks, XP, goals maths | `04-decisions.md` (ADR-005, ADR-006) and the tests |
| Any UI | `08-design-system.md` |
| Any naming | `05-glossary.md` |
| Something undecided | `06-open-questions.md` — if it is a product question, ask the owner |

### 1b. Ask how it fails
- **What could this lose?** Any write path, import, migration or delete.
- **Which day does this land on?** Anything touching dates or times.
- **Is this number derived and tested?** If a component computes a streak or progress, move it to `lib/`.

### 2. Plan
In the main session, before code, and agreed with the owner when non-trivial:
- The task ID from `status.json` (add one first if missing).
- Files, types and store actions involved; any schema change and its migration.
- Which model builds it and why.
- What "done" looks like, including tests.

### 3. Build
Dispatch `itqan-builder` with the plan in the prompt (it starts cold). The builder stops and
returns rather than guessing. **Verify delegated work yourself**: re-run `npm run ci:check` and
look at the UI in the browser — a report is a claim, not evidence.

### 4. Land
- [ ] `npm run ci:check` passes (dashboard check, typecheck, tests, build)
- [ ] The change was seen working in the running app (`npm run dev`)
- [ ] `memory/` updated in the same turn — and an ADR if a choice was made
- [ ] `status.json`: task status, `updated` date, a `log` entry (newest first)
- [ ] **What's new** (ADR-040): the task in a `src/content/releases.ts` entry — a new entry (next
      id, today's date) per shipped update, items written for the owner in all five languages; a
      task with nothing visible is listed with no items. `releases.test.ts` fails without it.
- [ ] `python3 scripts/build_dashboard.py`, committed **with** the `status.json` change
- [ ] Committed, message referencing the task ID and the reasoning
- [ ] **Shipped, without asking** (the owner's standing instruction, 2026-10-21): `git push origin main`
      (GitHub Pages redeploys — the iPhone and anyone else using the published app get it), then
      `scripts/install_local.sh` so the laptop app is current. Only once `ci:check` passes and the
      change was seen working; never push half-finished work, since the published app updates for
      every user. Then confirm the live site serves the new version.

## Always Opus — never delegate to Sonnet

1. Persistence, migrations, backup/restore, anything in `store.ts` that deletes or replaces
2. Date/day-boundary logic (`date.ts`, anything producing a `DateKey`)
3. Streak, XP, level, achievement, goal-pace, reminder-recurrence and check-in maths
4. The reminders helper (`scripts/itqan_reminders.py`) and anything that talks to it — it is a
   local network listener, so it is security work
5. The first instance of any new pattern (first new route type, first new persisted entity)
6. Sync (`src/lib/sync/`), accounts and anything security-related — a merge bug silently
   loses data on every device at once

## Sonnet is right for
New screens or components following existing patterns; copy; styling passes; tests for
already-specified behaviour; docs.

## What to decide, and what to ask
Every technical decision is the session's: decide, record an ADR, tell the owner in one line.
Ask the owner only about how he wants to use Itqan — their routine, what a screen should show, what
it should feel like. Research versions and APIs rather than recalling them.

## Model names go stale

Lineup as of 2026-10-16: Opus 5.5 (`claude-opus-5-5`), Sonnet 5.5 (`claude-sonnet-5-5`),
Haiku 5.5 (`claude-haiku-5-5`), Fable 5.1 (`claude-fable-5-1`). If any is superseded, update
this table and `.claude/agents/*.md` in the same turn, and add a `status.json` log entry.
