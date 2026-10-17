# 08 — Design System

The brief: **modern, clean, interactive, dynamic and fun**. The interpretation: a calm, premium
surface (generous space, soft borders, one accent) where *moments of progress* are lively —
spring animations, satisfying check-offs, confetti for big wins.

## Tokens (`src/index.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#f4f6f5` | `#0a100e` | Page background (+ two soft radial glows) |
| `surface` | `#ffffff` | `#101916` | Cards (at 80% with backdrop blur) |
| `surface-2` | `#eef2f0` | `#16211d` | Inputs, tracks, hover |
| `border` | `#e1e7e4` | `#213029` | All borders |
| `text` / `muted` | near-black / grey-green | near-white / grey-green | Copy |
| `accent` → `accent-2` | emerald → teal | brighter emerald → teal | Primary actions, progress (gradient) |
| `gold` | amber | amber | Streak flames, stars |
| `danger` | rose | rose | Overdue, delete |

Area colours are data (`AREA_HEX` in `colors.ts`): emerald, teal, sky, indigo, violet, rose,
amber, orange, lime, slate. They tint chips, rings and goal accents.

Theme: system by default, overridable in Settings; applied before first paint by an inline
script in `index.html` to avoid a flash.

## Type

Plus Jakarta Sans Variable, self-hosted. Headings `font-extrabold tracking-tight`; section
labels `text-[13px] uppercase tracking-wider text-muted`; numbers use `.tabular`.

**Interface languages (ADR-024):** Arabic UI text uses Vazirmatn (self-hosted Arabic subset,
in the `--font-sans` stack after Plus Jakarta Sans); Chinese uses the system CJK fonts. In Arabic
and Chinese, `tracking-*` and `italic` are neutralised by CSS — never add per-language classes.
Layout uses logical utilities (`ms-/me-/ps-/pe-/start-/end-/text-start`) so it mirrors in RTL;
pointing icons get `rtl:-scale-x-100`.

**Arabic** (Quran, hadith, Arabic sayings): `font-quran` = Amiri Quran, self-hosted Arabic subset,
`dir="rtl" lang="ar"`, `leading-[2]` so stacked marks never collide. Never set Quranic text in
the UI font or a system font — they draw open tanween and small high letters wrongly (ADR-023).

## Shape and depth

Cards `rounded-2xl`, modals `rounded-3xl` (bottom sheet on phones), buttons `rounded-xl`.
Shadows are near-invisible; the primary button gets a coloured glow.

## Motion (`motion/react`)

- Springs, short (0.3–0.8 s), low bounce. Lists use `layout` + `AnimatePresence`.
- Check-off: checkbox scales in with bounce + a two-note chime.
- All of today done → confetti + three-note chord. Level up → side cannons. Goal done → big burst.
- `prefers-reduced-motion` disables confetti. Sounds toggle in Settings.

## Layout

- Desktop (≥ `lg`): sticky sidebar (nav, New task, level card) + content up to `max-w-7xl`.
- Phone: top bar (logo, sync badge), bottom tab bar (Today, Plan, Habits, Goals, More), floating
  + button. "More" opens a sheet with every other screen, Focus first among them; a running focus
  timer shows as a dot on More and a countdown on the Focus tile. Bottom padding keeps content
  clear of the bar.

## Layout rules that prevent real bugs (2026-10-16)

- **Every overlay is portalled to `<body>`** (`Modal` in `ui.tsx` uses `createPortal`). An ancestor
  with `transform`, `filter` or `backdrop-filter` — every `Card`, every animated `motion.div` —
  becomes the containing block of a `position: fixed` child and clips it. This caused the missing
  Save button in sync setup and the ☰ menu covering the phone's top bar. New fixed layers (sheets,
  popovers that escape their card) must use a portal too.
- **Grid children may shrink** (`:where(.grid) > * { min-width: 0 }` in `index.css`); text inputs
  inside flex rows get `min-w-0`. Otherwise one long placeholder widens the page on phones.
- **Text fields are 16 px on phones** (`text-base sm:text-sm`) — iOS zooms the page on focus below 16 px.
- **Safe areas:** the phone header pads `env(safe-area-inset-top)`, bottom bar / FAB / toasts /
  dialog footers pad `env(safe-area-inset-bottom)`. Dialogs use `dvh`, not `vh`.
- **Phones get their own arrangement, not a squeezed desktop one:** stats and row actions move to
  their own line below `sm`; hover-only controls are always visible on touch.
- **No exit animations between pages** (ADR-021): pages fade in with CSS (`.page-enter`) and
  nothing waits for the previous page to leave. Do not reintroduce `AnimatePresence mode="wait"`
  around routes.
- **Touch has no HTML5 drag** — every drag interaction needs a tap alternative (◀ ▶ on board cards).
- **Daily content never pushes tasks down** (ADR-023): on a laptop the daily card heads the side
  column; on a phone it is one folded line until tapped. Add new "of the day" content there, as a
  tab, not as another card.
- Verify any UI change at 375 px (iPhone), 768 px and 1280 px, light and dark, including its dialogs.

## Copy

Written in English first, then translated; per-language rules and the glossary are in
`10-localization.md`.


Short, warm, never guilt-tripping: "A clear day", "one at a time", "Your first 25 minutes are the
hardest. Start small." Buttons name the action ("Add task", "Create habit", "Log 5 pages").
