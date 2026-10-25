# 00 — Project

## What Itqan is

A personal planner that joins three time scales in one place:

- **Today** — the tasks and habits that make up a day.
- **This week** — planning days ahead and reviewing the week behind.
- **The long run** — goals (objectives) that the daily work is *for*.

The name is **Itqan** (إتقان): doing a thing with excellence and care. It comes from the hadith
"Allah loves that when one of you does a deed, he does it with itqan", and it sets the tone: not
hustle, but steady, consistent, well-done work. The companion idea — "the most beloved deeds are
the consistent ones, even if small" — is why habits and streaks are central.

## Who it is for

**The owner**, first and only user for now (2026-10-16) — personal details are in
`memory/private/owner.md` (local only), including the routine Itqan was first built around.
In short: a full-time job alongside study, reading, exercise, a language and faith — "and many
other things".

He asked for it to be **dynamic, fun, modern, clean and interactive**, usable as soon as
possible, and published on **GitHub**. He may offer it to others later.

## What success looks like

1. He opens it every morning and it tells him, in one screen, what today is for.
2. The habits he cares about survive busy weeks — streaks make a missed day
   visible without making it shameful.
3. Each goal shows whether he is on pace, and how much per day finishes it on time.
4. Once a week he looks back (Weekly review) and adjusts.
5. It is pleasant enough that opening it is a small reward, not a chore (XP, levels,
   achievements, celebrations).

## Beyond planning (added 2026-10-16, at the owner's request)

- **Memories** — a private timeline of moments, with "On this day".
- **Ideas** — capture ideas as they come, then act on them (task, goal, done).
- **Notes** (2026-10-26) — Keep-style notes and checklists: pin, colour, label, search, archive;
  attach to an area, project or goal; any note or line becomes a task (ADR-035); pin one to
  Today to see it every day (ADR-036).
- **Projects** — bigger pieces of work broken into tasks, with progress and deadlines.
- **Achievements** — real wins recorded per year and category, with a year in review and export.
- **Connections** — the people who matter: how often to check in, birthdays, notes, history.
- **Reminders** — important dates (birthdays, anniversaries, deadlines, bills) with desktop
  notifications that arrive even when Itqan is closed.
- **The daily card** (2026-10-17) — on Today, a Quran verse and a hadith in Arabic, a word of the
  day (French B1 by default; five languages, A1–C2), wisdom from psychology, medicine and
  biology, and a fact. Quiet by design: one folded line on the phone (ADR-023).

## The starter set (seed)

On first run the user can load a **generic example set** (ADR-025) — areas Health, Mind,
Learning, Books, Work, Life; habits Drink water (8 glasses), Read (10 pages), Meditate (10 min),
Exercise (3×/week), Practise a skill (5×/week); goals Read 12 books, Run 5 km, Learn a new skill,
Finish an online course; four first-day tasks. All editable. It is deliberately nobody's real
routine: this repository is public. Source: `src/lib/seed.ts`.

## Out of scope for now

Accounts, sync between devices, collaboration, calendars from other services. See the roadmap
for when they would arrive.
