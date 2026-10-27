# 05 — Glossary

The vocabulary is fixed. Use these words in code, UI and memory alike.

| Term | Meaning | In code |
|---|---|---|
| **Area** | A life domain: Quran, French, Gym, Books, Courses… Colours and groups everything. | `Area` |
| **Task** | A one-off thing to do, optionally on a day. | `Task` |
| **Inbox** | Tasks with no day yet (`date === null`). | — |
| **Step** | A checklist item inside a task. UI says "Steps". | `Subtask` |
| **Time of day** | Morning / afternoon / evening / anytime grouping on Today. | `TimeOfDay` |
| **Habit** | A repeating practice with a schedule and a daily target. | `Habit` |
| **Schedule** | `daily`, specific `days` of the week, or `weekly` N times. | `HabitSchedule` |
| **Target** | Amount per day that counts as done (1 = simple check-off; 20 min; 10 pages). | `Habit.target` |
| **Met / missed / pending** | State of a scheduled period. Pending = today or this week, not met yet. | `PeriodState` |
| **Counted habit** | A habit with a unit or a target above 1 — pages, minutes, reps. Insights shows its totals. | `isCounted()`, `habitAmounts()` |
| **Round** | Optional whole a counted habit works through (a full reading of the Quran); a finished round starts the next (ADR-038). | `HabitRound`, `roundProgress()` |
| **Streak** | Consecutive met periods, ignoring pending (ADR-006). | `streak()` |
| **Day streak** | Consecutive days with *any* activity, kept alive by streak savers. The flame on Today. | `dayStreak()` |
| **Streak saver** | Earned every 500 XP (hold 2); covers a missed day of the day streak automatically (ADR-034). | `SAVERS`, `DayStreak.held` |
| **Goal** | A long-term objective. *Objective* in conversation = Goal in code. | `Goal` |
| **Numeric goal** | Progress toward a number (pages, juz, modules). | `kind: 'numeric'` |
| **Milestone goal** | Progress through a checklist of milestones. | `kind: 'milestones'` |
| **Check-in** | A logged amount of progress on a numeric goal. | `GoalLog` |
| **Pace** | Ahead / on track / behind / overdue, vs a straight line from start to deadline. | `goalPace()` |
| **Focus session** | A completed timer block, logged with minutes. | `FocusSession` |
| **Intention** | One line for "what would make today good". | `DayNote.intention` |
| **Weekly review** | Reflection for one week, keyed by the week's first day. | `WeeklyReview` |
| **Achievement** | A real-life win the owner records (career, faith, health…). | `Achievement` |
| **Badge** | A game reward unlocked by activity (Insights). Never called "achievement". | `Badge` |
| **XP / Level** | Points derived from activity (ADR-005); levels from XP. | `gamification.ts` |
| **Memory** | A moment worth keeping, dated when it happened. | `Memory` |
| **On this day** | Memories from today's month-day in earlier years. | `onThisDay()` |
| **Idea** | A captured idea, moved through New → Exploring → Doing → Done (or Dropped). | `Idea` |
| **Note** | A Keep-style card on the Notes screen: title, text and/or a checklist, colour, labels (ADR-035). Not the free `notes` text field on a task, idea or project. | `Note` |
| **On Today** | A note pinned to Today (`onToday`) — not the same as pinned to the top of Notes (`pinned`). | `Note.onToday` |
| **Label** | A free tag on a note, shown as `#label`; filters the Notes screen. | `Note.labels` |
| **Checklist line** | One tickable line of a note; may be made into a task. | `NoteItem` |
| **Reminder** | An important date or time, once or repeating, with alerts. | `Reminder` |
| **Alert** | One notification for one occurrence, N minutes before it. | `ScheduledAlert` |
| **Helper** | The local service that shows desktop notifications (ADR-013). | `itqan_reminders.py` |
| **Entity** | One independently-synced piece of data, keyed like `tasks:<id>`. | `Entities` |
| **Stamp / tombstone** | When an entity last changed; a tombstone marks a delete. | `Stamp` |
| **Sync file** | The encrypted `itqan-sync.json` in the private repo. | `Envelope` |
| **Project** | A body of work made of tasks, with a status and dates. | `Project` |
| **Stage** | A task's board column while open: To do or Doing. Done is `done`. | `TaskStage` |
| **Blocked** | A task waiting on something outside your control. | `Task.blocked` |
| **Next action** | The first unblocked task in Doing, else in To do. | `nextAction()` |
| **Project update** | A short status post on a project, optionally setting progress. | `ProjectUpdate` |
| **Pinned project** | Shown on Today. | `Project.pinned` |
| **Connection / person** | Someone you want to keep in touch with. UI: "Connections". | `Contact` |
| **Circle** | Family, friends, university, work, mentors, other. | `Circle` |
| **Rhythm** | How often to check in with a person. | `cadenceDays` |
| **Check-in** | A logged call, message, meetup or email with a person. | `Interaction` |
| **Reach out** | People overdue, due today or within 2 days. | `checkIn()` |
| **Daily card** | The card on Today with one verse, hadith, word, piece of wisdom and fact a day (ADR-023). | `DailyCard`, `Settings.daily` |
| **Verse / Hadith / Word / Wisdom / Fact** | The five kinds on the daily card. "Wisdom" = a saying or proverb, never a hadith. | `DailyKind` |
| **Word of the day** | A word in the chosen language and CEFR level, with an example. | `Word`, `WordPack` |
| **Training** | The exercise and gym screen (ADR-027, `memory/11-training.md`). | route `training` |
| **Exercise** | One movement: Bench press, Plank, Running. Measured by weight, reps, time or distance. | `Exercise` |
| **Routine** | A saved, ordered list of exercises with targets ("Push day"). Never "plan" or "template". | `Routine`, `RoutineItem` |
| **Program** | How routines are scheduled: fixed weekdays or a rotation. | `TrainingProgram` |
| **Workout** | One time you trained, on the local day it started. Never "session" (that is Focus). | `Workout` |
| **Set** | One logged set: reps, weight, time or distance, and effort. Warm-up sets never count for PRs. | `WorkoutSet` |
| **Effort** | How hard a set was: Easy, Good, Hard, Failed. | `Effort` |
| **PR** | Personal record on an exercise. | `personalRecords()` |
| **DateKey** | A local-time day as `yyyy-MM-dd`. Never UTC. | `DateKey` |
