

## ADR-051 | 2026-11-12 | accepted | Insights opens one section at a time, like Settings

**Context:** The owner, 2026-11-12: Insights should be like Settings (ADR-042) so it is easier to get
around, keeping the period filter, and the whole page as it is should stay available. Insights had
grown to five long stacked sections (Overview, Focus, Reading, Habits and areas, Progress).
**Decision:**
- **Sections at `#/insights/<section>`** (`INSIGHTS_SECTIONS` in `pages/Insights.tsx`), shaped as in
  Settings: on a laptop a sticky menu beside the open section (Overview when none is named); on a
  phone `#/insights` is the list and a section opens on its own with a way back. Reading is listed
  only once there is reading, as before.
- **"All on one page"** (`#/insights/all`) is the last entry, after a divider: every section in turn,
  exactly the page as it was.
- **The menu is a summary.** Each entry's second line is a live figure for the chosen period — XP
  and tasks, focus time and sessions, reading time and pages, habit-day consistency, badges — so the
  menu answers "how did it go?" before any section is opened. (Settings shows a static hint; a
  number earns its place here.)
- **One period for every section.** The 7/14/30/90-day chooser stays in the page header on a laptop
  and above the section on a phone (where the header is hidden, as in Settings), and is remembered
  on this device (`localStorage`, `itqan-insights-range`; a private window simply starts at 30).
- **Previous / next** buttons under a section step through them without going back to the menu.
**Rejected:** a tab strip (as ADR-042: five long labels wrap on a phone and in French); a jump menu
over the one long page (still one long page — what the owner asked to leave); syncing the chosen
period (a viewing preference per device, like zoom in the reader); a per-section period (comparing
sections over different periods would mislead).
