# Itqan Project Memory

Durable knowledge about this project, written so a session with no prior context can read this
directory and understand the project completely.

## Read order

| File | What it holds |
|---|---|
| `00-project.md` | What Itqan is, who it is for, the owner's routine and what success looks like |
| `01-architecture.md` | Stack, data flow, persistence, PWA, deployment, the path to sync |
| `02-conventions.md` | Code structure, naming, styling, testing policy |
| `03-roadmap.md` | Stages in build order, with scope and exit criteria |
| `04-decisions.md` | Decision log — every choice with its reasoning and rejected alternatives |
| `05-glossary.md` | Domain vocabulary. Read before naming anything |
| `06-open-questions.md` | Product questions waiting for the owner |
| `07-data-model.md` | Every persisted shape, and the migration procedure |
| `08-design-system.md` | Tokens, components, motion and copy rules |
| `09-workflow.md` | How every session works: the four phases and which model runs what |
| `10-localization.md` | How interface text works in code, how each language is written, the glossary |
| `11-training.md` | The Training feature's agreed spec (exercise and gym tracking, ADR-027) |
| `status.json` | Machine-readable state — drives `dashboard/index.html` |

## Maintenance rules

- Update the relevant file **in the same turn** that reality changes.
- `status.json` changes whenever a task or stage changes state; then run
  `python3 scripts/build_dashboard.py` and commit both together.
- Every entry in `04-decisions.md` records the rejected alternative and why.
- Never delete history. Supersede a decision with a new entry that references the old one;
  mark answered questions ANSWERED with the date and keep the text.
