# Itqan · إتقان

**Small deeds, done consistently.** A calm, modern planner for daily tasks, habits and long-term
goals. It's built for a life of courses, books, the gym, French and Quran revision, and works
for any routine.

Itqan means doing a thing with excellence and care. It's local-first: your data stays in your
browser, it works offline, and you can install it as an app on desktop or phone.

## Features

- **Today**: a progress ring, an intention and mood for the day, tasks grouped by morning,
  afternoon and evening, overdue tasks you can move to today in one click, habits you complete
  with a tap, the goals in progress, a line of daily wisdom and the Hijri date.
- **Plan**: a week view with an Inbox. Drag tasks between days.
- **Habits**: run them every day, on chosen days, or N times a week, with a daily target
  ("20 min", "10 pages"). Each habit shows its streak, best streak and 30-day rate, plus a
  20-week heatmap. You can backfill days you forgot.
- **Goals**: track a number (pages, juz, modules) or a list of milestones. Each goal says
  whether you're ahead or behind, and how much per day finishes it on time.
- **Focus**: a Pomodoro timer linked to a task, goal or area. It keeps running after a reload
  and notifies you when it ends.
- **Insights**: your level and XP, XP per day, balance across areas, habit consistency, a
  6-month activity heatmap and 18 achievements.
- **Weekly review**: an automatic summary of the week plus three reflection prompts.
- **Ideas**: save an idea in one line, move it through New → Exploring → Doing → Done, and turn it into a task or a goal in one click.
- **Reminders**: birthdays, anniversaries, deadlines and bills, once or repeating, with alerts like "1 week before". Desktop notifications arrive even when Itqan is closed.
- **Projects**: bigger pieces of work broken into tasks.
  - List or **board** view: To do, Doing, Done, with drag and drop, and ◀ ▶ buttons on the phone.
  - Flag tasks as **blocked**.
  - Progress comes from tasks, or you set it by hand.
  - **Pace** against the deadline, and a **next action**.
  - Status **updates** and an activity timeline, notes and links.
  - **Pin to Today**.
  - Typing `+portfolio` in quick add puts a task in that project.
- **Connections**: your family, friends, classmates and colleagues.
  - Choose how often to check in with each person, and Itqan tells you who to reach out to.
  - Log calls and meetups with notes.
  - Call, message, WhatsApp or email in one tap.
  - Get reminders about a person on any day, plus birthday reminders.
- **Achievements**: record your wins by year and category.
  - Mark how big each one was, and add proof links.
  - A **year in review** shows your count, major wins, the change from last year, and your top categories.
  - Itqan suggests wins from goals and projects you completed, long habit streaks, and focus hours.
  - Export a year as text for your CV or LinkedIn.
- **Memories**: a private timeline of moments with tags, favourites, search and "On this day".
- **Command bar** (`Ctrl+K`): type `Read 20 pages #books tomorrow !2 @evening ~30m` and the
  area, day, priority, time of day and estimate are filled in for you.
- **Fun**: XP, levels, badges, confetti, and sounds you can turn off. It follows your
  system's light/dark setting, and you can override it.
- **Your data**: JSON backup and restore, with a reminder every two weeks.

## Use it on your computer (no server, works offline)

```bash
./scripts/install_local.sh
```

This builds Itqan into one offline file (`app/index.html`) and adds **Itqan** to your app menu.
It opens in its own window, like a desktop app, and nothing needs to stay running. Your data is
saved in Itqan's own browser profile (`~/.local/share/itqan/browser`). After updating the code,
run the script again: it updates the app and leaves your data alone.

## Sync between your laptop and iPhone (free)

Itqan can keep your laptop and iPhone in sync through a **private GitHub repository** you own.
Everything is encrypted with your passphrase before it leaves the device, so GitHub only stores
unreadable data. Set it up in **Settings → Sync between devices**: the laptop first, then the
phone.

- The iPhone uses the GitHub Pages version: open it in Safari, then choose **Share → Add to Home
  Screen**.
- An iPhone can't get notifications from a web app without a paid server. Instead, use
  **Reminders → Add all to Calendar**, and the iPhone's own Calendar will alert you.
- Syncing happens when you open Itqan, a few seconds after each change, and every minute while
  it's open. Edits to different things on both devices are all kept. If both devices change
  the same item, the most recent change wins.

## Getting started (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck and production build into `dist/` (hosted PWA) |
| `npm run build:local` | One self-contained `app/index.html` that opens straight from disk |
| `npm test` | Unit tests (Vitest) |
| `npm run ci:check` | Everything CI runs: dashboard check, typecheck, tests, build |
| `npm run dashboard` | Regenerate the project status page from `memory/status.json` |

## Publish on GitHub Pages

1. Create a repository (for example `itqan`) and push this project to `main`.
2. In the repository, go to **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. Each push to `main` now runs `.github/workflows/deploy.yml` and publishes the app to
   `https://<you>.github.io/<repo>/`. Open it in Chrome and click the install icon in the
   address bar to use it as a desktop app.

> Data is stored per browser and per address. Data you enter at `localhost` doesn't appear on
> the GitHub Pages site. To move it, use **Settings → Download backup**, then **Restore** on
> the other address.

## Tech

React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, Motion, date-fns, vite-plugin-pwa,
Vitest. There's no backend. See `memory/01-architecture.md`.

## For contributors (human or AI)

Start with [`CLAUDE.md`](CLAUDE.md), then [`memory/`](memory/README.md). The project's
decisions, roadmap and conventions live there. [`dashboard/index.html`](dashboard/index.html)
is the generated status page.
