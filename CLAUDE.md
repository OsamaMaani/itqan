# Itqan — Read This First

You are working on **Itqan** (إتقان, "mastery, doing a thing with excellence"), the owner's personal
planner for daily tasks, habits and long-term goals. This file is the entry point for any
Claude session on this project, in any account, at any time. Read it fully before touching
anything.

## Ground rules for working on this project

1. **`memory/` is the source of truth for intent.** The code is the source of truth for what
   exists. When they disagree, the code is right about *what is* and `memory/` is right about
   *what was meant* — reconcile explicitly, never silently pick one.
2. **Follow the workflow in `memory/09-workflow.md` for every task.** Orient, plan, build,
   land — in that order. Planning and design run in the main session (Opus); standard
   implementation can be delegated to the `itqan-builder` subagent (Sonnet), escalated to
   Opus for anything on the always-Opus list in that file.
3. **Never lose the owner's data.** All data lives in their browser (ADR-002). Any change to a
   persisted shape in `src/lib/types.ts` bumps `SCHEMA_VERSION` and adds a migration step in
   `src/lib/migrations.ts`, **with a test**, in the same commit. See `memory/07-data-model.md`.
4. **Update memory in the same turn you change reality.** Finish a task, change a decision, or
   discover a constraint → edit the relevant memory file and `memory/status.json` immediately.
5. **Regenerate the dashboard after every status change:** `python3 scripts/build_dashboard.py`.
   It reads `memory/status.json` and rewrites `dashboard/index.html`. Never hand-edit the
   dashboard. **This is the page the owner monitors the project through**, so it is enforced, not
   trusted: `python3 scripts/build_dashboard.py --check` is CI's first step and fails if the
   committed HTML does not match `status.json`.
6. **Record decisions in `memory/04-decisions.md`.** Every choice gets an entry with its
   reasoning and the alternative that was rejected. An unrecorded reason gets re-litigated.
7. **`npm run ci:check` must pass before anything is called done** — dashboard check,
   typecheck, tests, production build.
8. **Technical decisions are yours; product decisions are the owner's.** Decide and record anything
   about how the app is built. Ask him only how he wants to *use* it — what a screen shows, what
   it asks, what their routine actually is (`memory/06-open-questions.md`).

## Who is building this

The owner — a software engineer building this for personal use first, largely with AI assistance,
alongside a full-time job and studies. It may become a product for others later, so keep that
door open — but never at the cost of being useful *now*.

**Personal context lives in `memory/private/owner.md` — local only, gitignored, never committed.**
Read it if it exists. Privacy matters to the owner: this repository is public, so never write
names, emails, locations or personal details into tracked files, commits or the dashboard.

## The three places where correctness is non-negotiable

Everywhere else a bug is an inconvenience. In these three it silently betrays the one user:

1. **Persistence, migrations and sync** — a bad migration or a careless `replaceAll` deletes months
   of history; with sync on (ADR-016), a merge bug or a stray tombstone deletes it on every device.
   `src/lib/sync/` is covered by tests that fail when a guard is removed — keep it that way.
2. **Day boundaries** — a "day" is a local-time `DateKey` (`yyyy-MM-dd` from `date.ts`). Never
   derive one with `toISOString().slice(0, 10)`: that is UTC, and east of UTC it shifts every
   late-night check-in onto the wrong day and breaks streaks.
3. **Derived numbers** — streaks, XP, levels, goal progress and pace are pure functions in
   `src/lib/{habits,gamification,goals}.ts` with tests. A wrong streak is a lie told to someone
   trying to build a habit. Components never compute these themselves. The same goes for
   reminder recurrence (`src/lib/reminders.ts`): a wrong date is a missed birthday.

## Repository layout

```
itqan/
├── CLAUDE.md               <- you are here
├── README.md               <- human-facing overview
├── memory/                 <- project knowledge base (see memory/README.md)
│   └── status.json         <- machine-readable state; drives the dashboard
├── .claude/agents/         <- itqan-builder: the implementation subagent
├── dashboard/index.html    <- generated status page, never edited by hand
├── scripts/                <- build_dashboard.py + its template
├── src/
│   ├── lib/                <- types, store, migrations, pure logic (+ __tests__)
│   ├── components/         <- shared UI (ui.tsx primitives, editors, shell)
│   └── pages/              <- one file per screen
├── public/                 <- icons
└── .github/workflows/      <- ci.yml (checks) and deploy.yml (GitHub Pages)
```

## Current state

Stages 0 (foundation) and 1 (daily-use MVP) are complete as of 2026-10-16: Today, Plan, Habits,
Goals, Focus, Insights, Weekly review, Settings, onboarding with an example starter set,
a Ctrl+K command bar with natural-language quick add, XP/levels/achievements, backup/restore,
installable PWA. Since then (Stage 2): a no-server local app with an app-menu launcher (ADR-012),
and Memories, Ideas and Reminders with desktop notifications via a local helper service
(ADR-013), encrypted sync between laptop and iPhone through a private GitHub repo (ADR-016), and Projects
and Connections (ADR-018, ADR-019), project boards (ADR-020), Achievements (ADR-022) the daily
card — verse, hadith, word, wisdom, fact (ADR-023), and five interface languages — English,
Arabic (RTL), French, Chinese, Spanish (ADR-024; rules in `memory/10-localization.md`), and Training —
exercises, routines, a program, live workouts, records (ADR-027; schema v8; `memory/11-training.md`).
`memory/status.json` and `dashboard/index.html` are the live answer — this
paragraph is a snapshot and will lag them.

How the owner uses it (ADR-012): `scripts/install_local.sh` builds one offline `app/index.html` and adds
an "Itqan" app-menu launcher (Chrome app mode, own profile at `~/.local/share/itqan/browser` —
that profile holds their real data). After any change he should use, re-run that script.

Develop: `npm install && npm run dev`, then http://localhost:5173 (separate, throwaway data).
