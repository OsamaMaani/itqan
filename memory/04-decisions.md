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
*(2026-10-17: the single daily line is superseded by the daily card, ADR-023.)*

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

---

## ADR-020 | 2026-10-16 | accepted | Project boards, manual progress, updates, next action, pinning

**Asked for:** manual progress for projects not tracked through tasks, and a To do / Doing / Done
board. **Decision (schema v4):**
- `Task.stage` (`todo` | `doing`) is the column while open; **`done` stays the single source of
  truth for done**, so streak/XP/review logic is untouched. `setTaskStage` keeps `done`,
  `doneAt` and `stage` consistent (tested): moving into Done completes once, out of Done reopens.
  `Task.blocked` flags waiting work (red on boards and lists; cleared on completion).
- `Project.progressMode` `tasks | manual` + `manualProgress` (0–100); a done project is 100 %.
- `ProjectUpdate` — short status posts, optionally setting manual progress — shown in one
  timeline with task completions (derived, not stored).
- **Pace** (ahead / on track / behind / overdue) compares progress with time elapsed between start
  and deadline; **next action** = first unblocked task in Doing, else To do. Both pure and tested
  in `src/lib/projects.ts`.
- `Project.view` (list / board) and `Project.pinned` (shown on Today) are stored on the project,
  so they follow the owner across devices.
- Board: drag & drop on desktop; ◀ ▶ buttons on touch (HTML5 drag does not work on iOS);
  columns scroll horizontally with snap on phones.

**Rejected:** a separate "issue" entity for boards (two kinds of task would split Today, Plan and
XP); a `status` enum replacing `done` (every reader of `done` would change, for no gain).

---

## ADR-021 | 2026-10-16 | accepted | Page changes never wait for an exit animation

**Bug:** after creating a project, tapping back could show a blank page. `AnimatePresence
mode="wait"` keeps the new page unmounted until the old page's exit animation finishes; a page
change arriving mid-animation, or a window that is not painting (paused animation frames), could
leave nothing mounted. **Decision:** the page wrapper is a plain keyed `<div>` with a CSS fade-in
(`.page-enter`); no exit animations between pages. New projects open after their dialog closes
(next tick). Verified by switching back and forth 50 ms apart.

---

## ADR-022 | 2026-10-16 | accepted | Achievements: the owner's real wins, by year and category

**Decision (schema v5):** `Achievement` — title, story, date, category (12 presets or a custom
label), impact (small / notable / major), highlight, tags, proof links, optional goal/project,
and `source`. The page shows one year at a time with a **year in review** (count, major wins,
change vs the previous year, category breakdown, highlights), category filter, search, a monthly
timeline, and a plain-text **export** per year (copy or .txt) for a CV, LinkedIn or a yearly
reflection. Logic in `src/lib/achievements.ts`, tested.

**Suggestions:** completed goals and projects, habit streaks of 30/100/365, and 10/50/100/500
focus hours are offered as achievements. `source` (e.g. `goal:<id>`) means a suggestion is never
offered again once recorded; "dismiss" is a per-device convenience in localStorage (not synced,
not essential). Completing a goal or a project offers "Add to achievements" in its toast; the
editor can be opened from anywhere (`openAchievement`, mounted once in App).

**Naming:** the game rewards in Insights were renamed **Badges** (`badges()` in gamification.ts)
so "Achievements" means only real accomplishments. Recording one is +5 XP; 10 unlock "Proud".

**Rejected:** generating achievements automatically without asking (it is a record of what the
owner is proud of — they choose); photos/certificates as files (localStorage limits, ADR-014 —
links instead).

---

## ADR-023 | 2026-10-17 | accepted | The daily card: a verse, a hadith, a word, wisdom and a fact

**Asked for:** on Today, a Quran verse and a hadith each day — in Arabic — plus high-value
sayings (psychology, medicine, biology), a fact, and a French B1 word with an example; switchable
in Settings, with the word's language (French, English, German, Spanish, Chinese) and level
(A1–C2) chosen there; and none of it may crowd the phone layout. Supersedes the single "daily
wisdom" line of ADR-011 (`wisdom.ts`, removed; its lines moved into the new sets).

**Decision — content (bundled, offline, `src/content/`):**
- **Verses (118 passages)**: Arabic is the KFGQPC Uthmani text (quranenc.com, via the
  `quran-json` 3.1.2 dataset), English is Saheeh International. KFGQPC encodes the "open" tanween
  with private code points (U+0657 / U+065E / U+0656) that every other font draws as *different
  marks*; they are mapped to Standard Unicode U+08F0–U+08F2. The mapping was proven against the
  Tanzil text on all 6,236 ayahs (tanween sequence identical in every one). Hizb markers removed.
  Curated to stand alone (patience, knowledge, effort, mercy, gratitude, creation, health,
  Quran revision); excerpts are cut on word boundaries and labelled "from …".
- **Hadith (102)**: Arabic is the Prophet's words ﷺ copied out of the cited hadith
  (fawazahmed0/hadith-api, sunnah.com numbering; Muslim by Fu'ad Abd al-Baqi's number). Only
  al-Bukhari and Muslim, or hadith al-Albani grades sahih or hasan — the grade is shown. Ibn Majah
  224 ("seeking knowledge is an obligation", in that wording) was dropped: graded very weak. The
  itqan hadith (al-Bayhaqi, hasan per al-Albani) is the one entry not in the verifier's sources and
  is marked `checked: false`. English is a plain rendering of the Arabic shown.
- **Wisdom (81)** and **facts (115)**: each names its author/work or study. Known misattributions
  and non-replicating findings are deliberately absent (listed at the top of each file).
- **Words**: 30+ per level per language (French B1: 90, with the B1 connectors used in an oral
  presentation), every noun with its article, every example with an English translation, pinyin
  for Chinese. Chinese levels map to HSK 1–6 (shown as "B1 · ≈HSK 3").
- **`scripts/verify_daily.py`** re-downloads the sources and checks every Arabic verse and hadith
  word for word, every verse's English against Saheeh International, and every grade. It is
  negative-tested (a changed word, a wrong number, a wrong grade and a non-SI word are all caught)
  and refuses to pass if it parsed nothing. Run it after any content change (not in CI: network).

**Decision — selection:** `pickForDay(items, day, salt)` in `src/lib/daily.ts` (pure, tested):
each item once per cycle of `items.length` days, a new shuffled order every cycle, never the same
item two days running, derived only from the DateKey — so laptop and iPhone show the same verse.

**Decision — presentation:** one card, one kind at a time behind five icon tabs (arrow keys
work). **Laptop:** the top of Today's side column — tasks do not move down. **Phone:** a single
folded line under the intention (icon, label, one-line preview); tapping opens it, and open/folded
is remembered per device (localStorage, like ADR-022's dismissals). Arabic in **Amiri Quran**,
self-hosted, Arabic subset, woff2 only (45 KB); end-of-ayah marks with Arabic-Indic numbers kept
with their last word. "Say it" buttons use the device's own speech voices and appear only when a
voice for the language exists. The card's content is a lazy chunk (41 KB gzip); each language's
words load only when chosen.

**Decision — settings (schema v6):** `Settings.daily` — five switches, "English meaning under the
Arabic", word language and level; default all on, French B1. Synced as part of `settings:shared`
(one last-writer-wins bundle, as before: a phone still on v5 during the upgrade window can reset
the choices to defaults, never data).

**Rejected:** fetching from Quran/hadith APIs at runtime (offline-first and private, ADR-002/012);
bundling the whole Quran (2 MB, and random ayahs out of context read badly); typing Arabic by hand
(one wrong mark in the Quran is not acceptable — everything is copied and verified); the KFGQPC
text as-is (wrong marks in Amiri and system fonts); Tanzil's "Uthmani minimal" text (drops marks a
reader of the mushaf expects); a fresh random pick on every load (changes on refresh and differs
between devices); showing all five at once (too tall on a phone); auto-rotating slides (motion
that distracts).

---

## ADR-024 | 2026-10-17 | accepted | Five interface languages: English, Arabic, French, Chinese, Spanish

**Asked for:** the whole app in Arabic, French, Chinese and Spanish, with every text checked
against the UX-writing principles of each language. The owner chose: translate *everything*
(daily-card content included), Western digits in Arabic (Quran verse numbers keep ١٢٣), and an
independent reviewer per language. Answers Q2 (S2-07), widened from Arabic to four languages.

**Decision — architecture (`src/i18n/`, rules in `memory/10-localization.md`):**
- **Typed catalogs, one file per screen per language.** English (`en/`) is the source and defines
  the `Messages` type; each translation is typed against it, so a missing or extra key is a
  compile error. English is bundled; the others load on demand (dynamic import), so English users
  pay nothing.
- **Intl does the formatting** — dates (`t.d` presets), times, numbers, percent, lists, relative
  time, plurals (`Intl.PluralRules`: Arabic's six forms), weekday/language names, the Hijri date.
  date-fns stays for date maths only. Arabic uses `ar-u-nu-latn` (Western digits).
- **Whole sentences only.** Placeholders `{name}`; React nodes inside a sentence via `rich()`;
  counts are plural objects, never "(s)". Lib code (no hooks) takes `t: I18n = tx()`.
- **Direction:** `<html dir lang>` follows the setting (also set before first paint in
  `index.html`); logical Tailwind utilities everywhere; pointing icons flip in RTL; the habit
  heatmap stays LTR (time runs left→right like a chart axis).
- **Fonts:** Arabic UI in Vazirmatn (self-hosted Arabic-subset woff2, 46 KB) — chosen over Noto
  Sans Arabic (166 KB) for size and its balance with the Latin UI font; Chinese uses the system
  fonts (a CJK web font is megabytes). Letter-spacing and italics are neutralised in Arabic and
  Chinese by CSS.
- **The setting (schema v7):** `Settings.language`, default `en`, **synced** across devices with
  the other shared settings; onboarding preselects the browser's language. Existing data is never
  translated — only text Itqan writes into data (the starter set, a birthday reminder's title) is
  written in the language active at that moment.
- **Quick add speaks the language too:** day, time and estimate words per language live in
  `quickAddWords.ts` (code, not the translated catalogs — a wrong word files a task on the wrong
  day), always with English. Matching ignores case, accents and Arabic diacritics/letter
  variants, reads Arabic-Indic and full-width digits and Chinese numerals, and treats Chinese
  characters as word edges (明天下午读书). Short forms that are ordinary words (French *mer*,
  Spanish *mar*, Arabic أحد) are deliberately absent. Tested per language.

**Decision — daily card content:**
- **Quran meanings are never translated by us.** French, Spanish and Chinese show a published
  translation — Hamidullah, Isa García, and Muhammad Makin (not Ma Jian: the dataset's Chinese is
  Makin's, from quranenc.com) — generated from quran-json 3.1.2 by
  `verify_daily.py --write-meanings` and checked word for word. Excerpts are cut by hand from that
  text and tested to be a run of it. **Arabic shows the verse and hadith alone**, with no
  translation under them.
- Hadith meanings (translated from the Arabic), sayings, facts, names and word meanings are
  translated per language in `src/content/i18n/`, **keyed by the English** — editing an English
  item makes its translation stop matching, and the completeness test fails until it is
  retranslated. A saying originally in the target language uses its real original wording.
- French/Spanish/Chinese words in their own interface language get a short definition in that
  language (as English words do in English).

**Decision — quality process:** a style guide per language (address: *tu*, *tú*, 你, Arabic
verbal nouns for actions; punctuation and spacing rules; a shared glossary) in
`memory/10-localization.md`; automated checks in `src/i18n/__tests__/catalogs.test.ts`
(completeness, no stale keys, placeholder parity, every plural form a count 0–1000 can hit,
per-language typography, leftover English, the quick-add examples parse, daily content complete);
then one translator per language. **Not yet done:** the planned *independent* reviewer per
language (checking against the guide and the language's established style guides) was started
but stopped before it finished, at the owner's request to ship what was complete — the
translations so far pass only the automated checks. A native-speaker or reviewer pass per
language is the follow-up (S2-23).

**Rejected:** a runtime i18n library (react-intl/i18next — Intl plus 200 lines covers it, typed);
English-keyed message strings in code (no compile-time completeness); Arabic-Indic digits in the
UI (the owner's choice); device-local language (the owner switches devices and expects the same
app); machine-translating at runtime (offline-first, and quality); translating the Quran's meanings
ourselves; translating the owner's data.

## ADR-025 | 2026-10-18 | accepted | The starter set is a generic example, not the owner's routine

**Context:** The onboarding starter set (`src/lib/seed.ts`, `src/i18n/*/seed.ts`) was the owner's
own routine — Quran revision, French to B1, the gym 4×/week, courses — and the onboarding text,
the quick-add examples and `memory/00-project.md` described it too. The repository is public, so
that was a personal profile in the open, and it made a poor first run for anyone else.
**Decision (the owner's):** replace it with a generic example that still shows every kind of thing
Itqan holds — six areas (Health, Mind, Learning, Books, Work, Life), daily and weekly habits with
and without a target, numeric and milestone goals, first-day tasks. The routine itself lives only
in `memory/private/owner.md`. Quick-add and command-bar examples name the new areas so the
catalog test that parses them still holds. No schema change: the starter set is created once at
onboarding and is ordinary data afterwards, so the owner's existing data is untouched.
**Rejected:** a random set generated at onboarding — harder to translate well and to test, and
no better at teaching the app; keeping a faith or language item — those were the identifying part.
**Note:** git history still holds the old text; rewriting a public repository's history was not
done.

## ADR-026 | 2026-10-19 | accepted | Goal cards summarise; a details dialog holds the rest

**Context:** The owner found goal cards too big: each one carried a 72 px ring, the "why", every
milestone, the facts line and six action buttons, so three or four goals filled a laptop screen.
They asked for smaller cards and "a professional way to see details".
**Decision:** The card shows only what is needed at a glance — a 52 px ring, the title (two lines
at most), area and pace chips, progress, one wrapping line of facts (deadline and days left,
needed per day, open tasks) — plus the one action used daily: **+** to log a numeric goal, or the
next undone milestone to tick. The whole card is one stretched button (`after:inset-0` on the
title) that opens `GoalDetails`, a wide `Modal` (a bottom sheet on phones): a summary panel, the
why, all milestones, the progress history with delete, and Delete / Pause or Resume / Mark
complete or Reopen / Edit / Log progress in the footer — icon-only below `sm` so it stays one row.
Opening Edit or Log closes the details first, so two dialogs never stack (Escape would close both).
**Rejected:** a card that expands in place (the grid jumps and the neighbours reflow); a separate
goal page with its own route (heavier than the content needs, and loses the list behind it); a
side drawer (a new overlay pattern for one screen, and phones would need the sheet anyway); a
"⋯" menu for the actions on the card (still a crowded card, and actions hide behind a second tap
without the context the details give).

## ADR-027 | 2026-10-20 | accepted | Training: exercises, routines, a program, workouts and sets

**Context:** The owner asked for exercise and gym tracking: build a full plan, follow it, see the
next exercise and last time's numbers, log reps, weight and how hard each set was, and look back
at any day. Spec agreed in chat and kept in `memory/11-training.md`. Schema v8.
**Decision:**
- **Five new shapes** (`types.ts`): `exercises`, `routines` (each with its `items` inline),
  `workouts`, `workoutSets` — four array collections, synced one entity per item like everything
  else — and `program: TrainingProgram | null`, plus `Settings.weightUnit` (shared, synced).
- **Sets are their own collection, not an array inside the workout.** Sync merges per entity
  (ADR-016); sets nested in a workout would make two devices logging the same workout overwrite
  each other's sets. As separate entities every set survives.
- **A workout snapshots its routine's items when it starts** (`Workout.items`), and sets point at
  the item (`WorkoutSet.itemId`). Editing a routine never rewrites history, the same exercise can
  appear twice in one workout, and adding or reordering during a workout edits only the snapshot.
- **The program is `null` until first saved**, and is one entity `program:main`. A default
  object would exist on every device from the upgrade on: it would count as "user data" and stop
  a fresh device being recognised as fresh, and a fresh device's default could overwrite the real
  program. Null means only a device where the program was really set up ever sends one.
- **Weights are stored in kg, full precision**; lb is display only (`Settings.weightUnit`), so
  switching never changes history. Distance in metres, time in seconds.
- **A workout's day is `todayKey()` when it starts** and never changes (day-boundary rule).
- **An unfinished workout is just a workout with `finishedAt: null`** — saved and synced like any
  other, so reopening Itqan (on either device) resumes it. The rest timer is device-local: its end
  time lives in its own localStorage key outside `Data`, never synced or migrated.
- **Linked habit:** `program.habitId`. Finishing a workout adds 1 to that habit on the workout's
  day; deleting a finished workout takes the 1 back (never below 0). Written, not derived:
  deriving would change `amountOn()` and every habit call site for one link.
- **Linked goals are derived:** `Goal.link` (`null` | follow an exercise's best weight / reps /
  time | count workouts). `goalCurrent()` reads workouts and sets for a linked goal instead of
  check-ins, so deleting a workout can never leave a stale number. Goal functions take the data
  (`GoalSources`) instead of only the check-ins.
- **Every training number is a pure tested function** in `src/lib/training.ts`: next routine,
  last time, suggestions, PRs (warm-ups excluded), estimated one-rep max (Epley), workout totals,
  weekly sets per muscle. Components never compute them.
- **Starter exercises are opt-in** ("Add common exercises", in the interface language). The
  upgrade adds nothing to existing data.
**Rejected:** sets inside the workout (sync would lose sets logged on two devices); a default
program object (fresh-device detection and overwrite risk, above); storing the unit with each
set (every comparison and PR would need converting; one canonical unit is simpler and exact
enough at full precision); deriving the linked habit (touches all habit maths for one feature);
check-in logs for linked goals (go stale when a workout is deleted); "Plan" or "Session" as names
(both already mean something in Itqan).

## ADR-028 | 2026-10-21 | accepted | Training "whenever I can": a program with no schedule

**Context:** The owner pointed out that many people can't train on fixed days or a strict
rotation — busy people go when they can — and the app should still be useful to them.
**Decision (product choices the owner's, 2026-10-21):** a third program mode, `flexible`
("Whenever I can"), and the **default** for a new program and for no program at all.
- Nothing is ever due or missed. `dueRoutine()` returns `{ kind: 'suggest' }` with the routine left
  longest (never-done first, in routine order; only finished workouts count) — so irregular weeks
  still spread over every routine — shown as "Ready when you are", with "last done …" and
  "Last workout: …" as information, never a reproach.
- An optional weekly aim (`perWeek`, 0 = none). With 0 the week shows only the count; badges need
  one workout a week.
- Today shows the Training card every day once a routine exists (quiet, one line).
- Schema v9: the step changes no data. The version moves so a device that doesn't know the mode
  pauses sync and asks to be updated rather than treating `flexible` as a rotation.
**Rejected:** treating "no program" as its own state only (people who chose a schedule and then
got busy need to switch to it explicitly); suggesting the next routine in list order (repeats the
first routine on every irregular visit); a "days since last workout" warning colour (shame, the
opposite of ADR-006's spirit).
