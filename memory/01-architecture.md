# 01 — Architecture

## Shape

A **local-first, installable web app** (PWA). One codebase, no server.

```
 Browser / installed PWA
 ┌──────────────────────────────────────────────────────────┐
 │  pages/*  ── read via hooks ──►  lib/hooks.ts (derived)  │
 │     │                               │                    │
 │     └── call actions ──►  lib/store.ts (Zustand)         │
 │                              │  persist + migrate        │
 │                              ▼                           │
 │                        localStorage "itqan-store"        │
 │  pure logic: lib/habits.ts · goals.ts · gamification.ts  │
 │              quickAdd.ts · date.ts                        │
 │  text: i18n/ (catalogs, Intl formatting, RTL) ADR-024     │
 │  service worker (vite-plugin-pwa) → works offline        │
 └──────────────────────────────────────────────────────────┘
         ▲ deploy: GitHub Actions → GitHub Pages (static)
```

## Stack (as installed 2026-10-16)

| Layer | Choice |
|---|---|
| Language | TypeScript 6 (strict) |
| UI | React 19 |
| Build | Vite 8 + `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 (CSS-first config in `src/index.css`) |
| State | Zustand 5 with `persist` middleware |
| Animation | `motion` (Framer Motion) 14, `canvas-confetti` |
| Icons | `lucide-react` |
| Dates | `date-fns` 4 |
| Font | Plus Jakarta Sans; Vazirmatn (Arabic UI); Amiri Quran (verses) — all self-hosted via @fontsource, so offline works |
| Languages | `src/i18n/`: typed catalogs (en source; ar, fr, zh, es loaded on demand) + `Intl` for dates, numbers and plurals (ADR-024, `10-localization.md`) |
| PWA | `vite-plugin-pwa` (auto-updating service worker) |
| Tests | Vitest 5 |

## Data flow rules

- **One store, all writes through actions** (`src/lib/store.ts`). Components never assemble new
  state objects themselves.
- **Derived values are never stored.** XP, levels, streaks, goal progress and pace are computed
  from history by pure functions (ADR-005). Undo and delete therefore always stay consistent.
- **Selectors must return stable references** (Zustand 5 + React 19 will loop otherwise): select
  slices, or use `useShallow` (see `useData()` in `hooks.ts`).
- **Days are `DateKey`s in local time** (`date.ts`). Instants are ISO strings.

## Persistence

`localStorage` key `itqan-store`, versioned (`SCHEMA_VERSION` in `migrations.ts`). On load,
Zustand calls `migrate(persisted, fromVersion)`, which runs each step then `normalize()` so a
missing collection can never crash the UI. The app asks for persistent storage
(`navigator.storage.persist()`), offers JSON backup/restore in Settings and nudges every 14 days.

Size budget: a year of heavy use is well under 1 MB; localStorage allows ~5 MB. Move to IndexedDB
only if a real profile approaches 2 MB (ADR-002).

## Routing

Hash routes (`#/today`, `#/goals`, …) in `src/lib/router.ts` — static hosting needs no rewrites
(ADR-003). Keys `1`–`8` jump between them; `Ctrl+K` opens the command bar.

## Deployment

**Primary — on the owner's computer (ADR-012):** `scripts/install_local.sh` runs `npm run build:local`
(one self-contained `app/index.html`, works from `file://`) and adds an "Itqan" app-menu
launcher that opens it in Chrome app mode with its own profile at `~/.local/share/itqan/browser`
— which is where the local app's data lives. No server runs. To update: `git pull`, re-run the
script; it runs `npm ci` whenever `package-lock.json` is newer than npm's record of the last
install (`node_modules/.package-lock.json`), never plain `npm install`, which can rewrite tracked
files and block the next pull.

**Secondary — hosted:** `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo>/` and publishes `dist/` to GitHub
Pages on each push to `main`. `ci.yml` runs the dashboard check, typecheck, tests and build.

## Sync between devices (ADR-016)

```
 laptop (file:// app)  ─┐   pull → merge per entity → apply → push (sha-checked)
                        ├──►  github.com/<you>/itqan-data  (private)  itqan-sync.json
 iPhone (GitHub Pages) ─┘     = AES-GCM ciphertext of { entities, meta(stamps, tombstones) }
```

Code: `src/lib/sync/` — `entities.ts` (split/rebuild), `merge.ts` (stamps, tombstones, merge),
`crypto.ts` (PBKDF2 + AES-GCM), `github.ts` (contents API), `engine.ts` (the cycle, triggers,
connect/disconnect). UI: `components/SyncPanel.tsx`. Sync state is its own localStorage key
(`itqan-sync`), so `Data` is untouched by sync.

## Notifications (ADR-013, ADR-031)

```
 laptop app ──PUT schedule──► helper (127.0.0.1, notify-send) ──Web Push──► Apple/Google push ──► phone's service worker
     ▲  builds + encrypts each push (lib/push.ts)                                                       │
     └──────────────── sync carries the phone's PushTarget ◄── phone subscribes (lib/pushDevice.ts) ◄──┘
```

`lib/notifier.ts` decides what is announced (`Settings.notify`, per device) and talks to the
helper; `lib/pushDevice.ts` is the receiving device's side; `public/push-sw.js` shows a push;
`components/NotificationsPanel.tsx` (Settings) is the only place the browser's permission is asked.

## The path to "others can use it" (not built)

When/if Itqan becomes multi-user (Stage 4), add **sync, not a rewrite**: keep the local store as
the primary copy and add an optional account that syncs the same `Data` document (e.g. Supabase
or a small Go service — the owner's strongest language). The `Data` type and migrations are already
the contract such a server would store.
