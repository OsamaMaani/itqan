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
| **Streak** | Consecutive met periods, ignoring pending (ADR-006). | `streak()` |
| **Active streak** | Consecutive days with *any* activity. Shown as the flame on Today. | `activeStreak()` |
| **Goal** | A long-term objective. *Objective* in conversation = Goal in code. | `Goal` |
| **Numeric goal** | Progress toward a number (pages, juz, modules). | `kind: 'numeric'` |
| **Milestone goal** | Progress through a checklist of milestones. | `kind: 'milestones'` |
| **Check-in** | A logged amount of progress on a numeric goal. | `GoalLog` |
| **Pace** | Ahead / on track / behind / overdue, vs a straight line from start to deadline. | `goalPace()` |
| **Focus session** | A completed timer block, logged with minutes. | `FocusSession` |
| **Intention** | One line for "what would make today good". | `DayNote.intention` |
| **Weekly review** | Reflection for one week, keyed by the week's first day. | `WeeklyReview` |
| **XP / Level** | Points derived from activity (ADR-005); levels from XP. | `gamification.ts` |
| **Memory** | A moment worth keeping, dated when it happened. | `Memory` |
| **On this day** | Memories from today's month-day in earlier years. | `onThisDay()` |
| **Idea** | A captured idea, moved through New → Exploring → Doing → Done (or Dropped). | `Idea` |
| **Reminder** | An important date or time, once or repeating, with alerts. | `Reminder` |
| **Alert** | One notification for one occurrence, N minutes before it. | `ScheduledAlert` |
| **Helper** | The local service that shows desktop notifications (ADR-013). | `itqan_reminders.py` |
| **Entity** | One independently-synced piece of data, keyed like `tasks:<id>`. | `Entities` |
| **Stamp / tombstone** | When an entity last changed; a tombstone marks a delete. | `Stamp` |
| **Sync file** | The encrypted `itqan-sync.json` in the private repo. | `Envelope` |
| **Project** | A body of work made of tasks, with a status and dates. | `Project` |
| **Connection / person** | Someone you want to keep in touch with. UI: "Connections". | `Contact` |
| **Circle** | Family, friends, university, work, mentors, other. | `Circle` |
| **Rhythm** | How often to check in with a person. | `cadenceDays` |
| **Check-in** | A logged call, message, meetup or email with a person. | `Interaction` |
| **Reach out** | People overdue, due today or within 2 days. | `checkIn()` |
| **DateKey** | A local-time day as `yyyy-MM-dd`. Never UTC. | `DateKey` |
