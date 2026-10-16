# 04 — Decision Log

Every decision, with reasoning and the rejected alternative. Format:
`ADR-nnn | date | status | title`. Status: `accepted`, `superseded by ADR-nnn`, `proposed`.

---

## ADR-001 | 2026-10-16 | accepted | An installable web app (PWA), not a native desktop app

**Context:** The owner said it could be "either a desktop app or a web page — whatever is more suitable".

**Decision:** a Progressive Web App. It runs in any browser, installs from Chrome/Edge's address
bar as a desktop app with its own window and icon, installs on their phone via "Add to Home
screen", and works offline. One codebase, deployed free on GitHub Pages.

**Rejected:** Electron (≈100 MB per install, separate build/sign/update pipeline, no phone);
Tauri (lighter, but still a native toolchain and no phone story for a solo builder today);
a native mobile app (Flutter is in their skill set, but the desktop is where he plans). Revisit in
Stage 5 only if a PWA limit actually bites.

---

## ADR-002 | 2026-10-16 | accepted | Local-first: data in the browser, no backend in v1

**Decision:** all data is one JSON document in `localStorage`, versioned and migrated, with JSON
backup/restore and a 14-day backup nudge.

**Reasoning:** "usable as soon as possible" — no hosting, auth or server to run; instant UI;
private by default; works offline. One user, small data (< 1 MB/year).

**Rejected:** a backend with accounts now (days of work before the first useful screen, plus
running costs and security surface); IndexedDB (async API complexity buys nothing at this size —
revisit at ~2 MB).

**Accepted risk:** clearing site data deletes everything. Mitigated by persistent-storage request,
backup button, reminders, and the Stage 4 sync path.

---

## ADR-003 | 2026-10-16 | accepted | Hash routing

**Decision:** `#/today`-style routes via a 20-line hook (`router.ts`).
**Reasoning:** GitHub Pages serves static files with no rewrite rules; hash routes never 404 on
refresh. Eight screens need no router library.
**Rejected:** `react-router` with the `404.html` redirect trick — more moving parts for nothing.

---

## ADR-004 | 2026-10-16 | accepted | React 19 + TypeScript + Vite + Tailwind 4 + Zustand + motion

**Reasoning:** the most widely documented stack (best AI-assisted output), fast builds, a tiny
state library with built-in persistence and versioned migration, and a mature animation library
for the "fun and interactive" brief.
**Rejected:** Next.js (SSR/server features are dead weight for a local-first static app); Vue
(fine, but no advantage here); Redux (boilerplate); a component kit like MUI (heavier, and the
brief is a distinctive look, not a generic one).

---

## ADR-005 | 2026-10-16 | accepted | XP, levels and achievements are derived, never stored

**Decision:** `xpEvents(data)` recomputes XP from tasks, habit logs, focus sessions, goal logs,
milestones, reviews and intentions. Levels and achievements derive from that.
**Reasoning:** undoing a task, deleting a habit or restoring a backup can never leave XP
inconsistent. The computation is cheap at this data size.
**Rejected:** an XP counter incremented by actions — drifts on every undo/delete/import.

XP table (tunable in `gamification.ts`): task 10 (+5 per priority level, +2 per done step);
habit day met 8; focus 1/min; goal check-in 5; milestone 25; goal complete 150; weekly review
30; daily intention 3. Level n→n+1 costs 100 + 50·(n−1).

---

## ADR-006 | 2026-10-16 | accepted | Habit streak semantics

1. A day is **met** when the logged amount reaches the habit's target.
2. **Today is pending** until met — an unfinished today never breaks a streak.
3. Days a "specific days" habit is not scheduled on are **skipped**, not missed.
4. Weekly-quota habits ("4× a week") streak in **weeks**; the current week is pending.
5. **Backfilling** is allowed (tap a past day) and counts — the app serves honesty, not policing.
6. Days **before the habit existed** are never misses (affects completion rates).

**Rejected:** strict streaks that break at midnight on an unfinished day (punishing, and wrong
for late-night Quran revision); counting unscheduled days as misses.

---

## ADR-007 | 2026-10-16 | accepted | Versioned schema with mandatory migration tests

**Decision:** `SCHEMA_VERSION` + `steps[n]` in `migrations.ts`, run by Zustand's `persist`
`migrate`, then `normalize()`. Backups carry `schemaVersion`; a backup from a newer version is
refused rather than guessed at.
**Reasoning:** there is no server copy — a broken migration is permanent data loss.

---

## ADR-008 | 2026-10-16 | accepted | Hand-drawn SVG charts, no chart library

**Reasoning:** the charts are simple (bars, rings, heatmaps); a library would add ~100 KB and
fight the design tokens. **Rejected:** Recharts / Chart.js. Revisit if a complex chart is needed.

---

## ADR-009 | 2026-10-16 | accepted | Week starts on Saturday by default

**Reasoning:** a common working week in the region. Configurable (Saturday/Sunday/Monday) in Settings.
Pending the owner's confirmation (Q1).

---

## ADR-010 | 2026-10-16 | accepted | A proven memory system, adapted

**Decision:** the same structure as the owner's earlier project — `CLAUDE.md` entry point, numbered
`memory/` files, `status.json` driving a generated `dashboard/index.html` enforced by
`--check` in CI, an ADR log, and a builder subagent with model routing.
**Adapted:** That project's three non-negotiables become Itqan's
(persistence, day boundaries, derived numbers). Laravel-specific files are omitted.
**Reasoning:** The owner asked for it explicitly, and it is proven on an earlier project.

---

## ADR-011 | 2026-10-16 | accepted | A hijri date and Islamic sources are first-class, not an add-on

**Decision:** Today shows the Hijri date (Umm al-Qura, via `Intl`, toggleable); the daily line
rotates hadith, Quran verses and classical proverbs (paraphrased, `wisdom.ts`); onboarding opens
with "Bismillah".
**Reasoning:** Quran revision is part of the owner's daily life and the app's name is a hadith term.

---

## ADR-012 | 2026-10-16 | accepted | Primary use: a local single-file app opened from the app menu

**Context:** The owner clarified what matters most: it must work locally, keep their data, and open
without running any program (no dev server, no terminal).

**Decision:** `npm run build:local` (Vite + `vite-plugin-singlefile`, `LOCAL=1`) produces one
self-contained `app/index.html` — JS, CSS and fonts inlined, relative paths, hash routing, no
service worker — that works from `file://`. `scripts/install_local.sh` builds it and writes an
"Itqan" launcher (`~/.local/share/applications/itqan.desktop`) that opens it in Chrome's app
mode (own window, own dock icon) with a **dedicated browser profile** at
`~/.local/share/itqan/browser`.

**Reasoning:** zero processes to keep running; works fully offline; the dedicated profile means
clearing everyday browsing data in their normal Chrome cannot wipe the planner. Verified
2026-10-16: localStorage written from the `file://` page survived a full Chrome restart.

**Rejected:** a background local web server started at login (a process to babysit, a port to
keep free); installing the PWA from GitHub Pages as the main copy (depends on the hosted site
for the first load and updates; still available as a second way in, with separate data);
Electron/Tauri (ADR-001).

**Consequences:** the data for the local app lives in that profile, separate from any
`localhost` or GitHub Pages copy — move data between them with Backup/Restore. Updating the app
= re-run `scripts/install_local.sh` (data untouched). `app/` is a build output and is gitignored.

---

## ADR-013 | 2026-10-16 | accepted | Desktop reminders through a tiny local helper service

**Context:** The owner wants reminders for important dates pushed as desktop notifications. The
app is a `file://` page (ADR-012): a page can only notify while it is open, and web push needs
a server.

**Decision:** `scripts/itqan_reminders.py` (Python standard library only) runs as the systemd
user service `itqan-reminders`, started at login. The app computes a flat list of alerts with
`buildSchedule()` in `src/lib/reminders.ts` (the only place reminder rules live, tested) and
PUTs it to the helper on load, on every reminder change and hourly (400-day horizon). The
helper fires each alert key once with `notify-send` (important ones as critical = stay until
dismissed), and still fires alerts missed by up to 12 h (laptop asleep).

**Security:** binds 127.0.0.1 only; rejects any Host other than 127.0.0.1/localhost (DNS
rebinding); rejects any request with a web Origin (only the `file://` app's `"null"` or local
tools); writes require a 256-bit token generated at install (`~/.local/share/itqan/helper-token`,
mode 600) and baked into the local build only (`app/` is gitignored); notify-send gets an
argument list, never a shell. Each guard was tested by attacking it (2026-10-16).

**Fallback:** builds without the token (dev, GitHub Pages) alert in-app — toast plus browser
Notification — while open.

**Rejected:** browser-only notifications (nothing when closed); a cron job reading Chrome's
LevelDB directly (fragile, undocumented format); duplicating the recurrence rules in Python
(two implementations drift — the helper is deliberately dumb).

---

## ADR-014 | 2026-10-16 | accepted | Memories are text (+ emoji, tags) for now — no photos

**Reasoning:** everything lives in `localStorage` (~5 MB). Photos would exhaust it within weeks
and risk the whole store. Photos need IndexedDB/OPFS storage plus backup support for binary
data — worth doing as its own task if the owner wants them (Q7).

---

## ADR-015 | 2026-10-16 | accepted | Ideas link to the tasks and goal made from them

**Decision:** an `Idea` keeps `taskIds` and `goalId`; "Make a task" creates a linked task and
moves a new idea to *Doing*; the card shows linked-task progress. Stale task ids (task deleted)
are ignored on read rather than cleaned up on write.
**Rejected:** an `ideaId` on `Task` — it would change the Task shape for a one-directional need.

---

## ADR-016 | 2026-10-16 | accepted | Free sync through an encrypted file in a private GitHub repo

**Context:** The owner wants the same data on their laptop and iPhone, for themselves only, without
paying for a server (Q6, answered "go" on 2026-10-16).

**Decision:**
- **Transport:** one file, `itqan-sync.json`, in a **private** repository (`itqan-data`), read and
  written through the GitHub contents API with a **fine-grained token limited to that repository,
  Contents read & write**. Writes send the file's `sha`; a stale sha (409/422) means the other
  device saved first → re-read, re-merge, retry. Reads use `cache: 'no-store'` + ETag.
- **Encryption:** AES-256-GCM, key from the passphrase via PBKDF2-SHA-256 (600,000 iterations,
  random salt kept in the file), fresh IV per write. GitHub only ever holds ciphertext. The
  derived key (not the passphrase) and the token are kept in this device's localStorage.
- **Merge:** data is split into entities (`src/lib/sync/entities.ts`: one per item, per habit-day,
  per day note, per review, plus shared settings). Each carries the time it last changed; a
  delete leaves a tombstone. Per entity, the newer change wins — so edits to different things on
  two devices both survive, and the merge converges whichever side runs it (tested).
- **Change tracking without touching the data model:** a store subscriber diffs entities by
  reference after every action and stamps what changed (`stamp()`); stamps live in a separate
  `itqan-sync` localStorage key, so `Data` and its migrations are unchanged. Pre-sync data is
  stamped "ancient" (u = 1). A device joining with no data of its own stamps its settings u = 0
  so it takes the synced name and week start.
- **Safety:** an edit made while a sync is on the network restarts the cycle instead of being
  overwritten; a wrong passphrase is refused before anything changes; a public repository is
  refused; a newer remote schema stops sync until this device updates; an older one is migrated.
- **Device-local, never synced:** running timer, theme, sounds, onboarding, backup date.

**Rejected:** Firebase/Supabase (accounts, SDKs; Google sign-in cannot run from the `file://`
laptop app; Supabase pauses idle free projects); a gist (secret gists are unlisted, not
private); manual backup/restore through iCloud (not sync); whole-file last-writer-wins (loses
the other device's edits).

**Accepted costs:** not real-time (on open, ~3 s after an edit, every minute while open);
tombstones accumulate (tiny); "Delete everything" on one device deletes on all — the prompt says so.

---

## ADR-017 | 2026-10-16 | accepted | iPhone reminders through the iPhone's own Calendar

**Context:** a home-screen web app on iOS can only receive notifications through Web Push,
which needs a server to send them.

**Decision:** Reminders can be exported as an `.ics` calendar (`src/lib/ics.ts`) — per reminder
or all at once — with RRULEs and VALARMs that match Itqan's rules (31st → last day of month,
29 Feb → last day of Feb, all-day alerts at 09:00). iOS opens its "Add to Calendar" sheet and
then alerts natively, offline. The laptop keeps its own helper (ADR-013).

**Rejected:** a free push relay (third-party service holding a subscription for the owner's phone —
another account and a dependency for one feature).

---

## ADR-018 | 2026-10-16 | accepted | Connections: a personal relationship manager on top of reminders

**Decision:** `Contact` (circle, tags, phone/email/link, company/role, how-we-met, birthday with
optional year, notes, check-in rhythm), `Interaction` (call / message / meet / email / other,
dated, with a note). The check-in rules live in `src/lib/connections.ts` (tested):
- last contact = latest interaction or the hand-entered "last time we talked", whichever is later;
- next check-in = last contact + rhythm, or snooze date if later; a person never contacted counts
  from the day they were added, so importing many people does not make them all due at once;
- "Reach out" lists people overdue, due today or within 2 days.

**Reuse, not a second engine:** "Remind me about this person" is an ordinary `Reminder` with a
`contactId`; a birthday is a yearly reminder created by `syncBirthdayReminder` (and removed with
the person). So desktop notifications (ADR-013), the iPhone Calendar export (ADR-017) and sync all
work for people without new code. Check-ins also send a 10:00 desktop nudge on their due day.
A birthday without a year sets `countYears: false` so no wrong age is shown.

**Rejected:** a separate birthday/alert engine for contacts (two recurrence implementations
drift); importing phone contacts (no web API on iOS; and most phone contacts are not people you
want to keep up with).

---

## ADR-019 | 2026-10-16 | accepted | Projects group tasks; goals stay outcomes

**Decision:** a `Project` (status planning / active / on hold / done / archived, dates, area,
optional goal, notes, links) owns tasks through `Task.projectId`. Progress = done ÷ all tasks;
focus time = sessions on its tasks. Quick add understands `+project`; an idea can become a
project. Deleting a project keeps its tasks.
**Why not reuse Goals:** a goal is an outcome measured by a number or milestones; a project is
a body of work measured by its tasks. A project may serve a goal (`goalId`).
**Detail pages** use `#/projects/<id>` (router now carries one parameter).

Schema v3 (migration tested on its own and through sync): `projects`, `contacts`,
`interactions`; `Task.projectId`; `Reminder.contactId` and `Reminder.countYears`.
