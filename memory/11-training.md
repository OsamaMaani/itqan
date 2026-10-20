# 11 — Training (exercise and gym tracking)

The product spec for the Training screen, agreed with the owner on 2026-10-20 in chat. This is the
source of *intent*; the code is the source of what exists. Decision record: ADR-027.

## What it is for

One place to set out a whole training plan, follow it at the gym or at home, and log what was
actually done — so that during a workout you always see **what comes next** and **what you did
last time** (to know whether to go heavier), and afterwards you can open **any day** and see
exactly what happened. Gym, home, bodyweight, dumbbells, machines, cardio — all of it.

## Words (also in `05-glossary.md`)

| Word | Meaning | In code |
|---|---|---|
| Training | The screen | route `training` |
| Exercise | Bench press, Plank, Running… | `Exercise` |
| Routine | A saved list of exercises with targets ("Push day") | `Routine`, `RoutineItem` |
| Program | How routines are scheduled | `TrainingProgram` |
| Workout | One time you trained, on a day | `Workout` |
| Set | One logged set | `WorkoutSet` |
| Effort | Easy / Good / Hard / Failed | `Effort` |
| PR | Personal record | `personalRecords()` |

"Plan" (the week screen) and "Focus session" already exist — never reuse them here.

## Scope of the first version

1. **Exercises** — name, equipment (bodyweight, dumbbell, barbell, machine, cable, kettlebell,
   band, other), how it is measured (reps × weight; reps, optionally with added weight; time;
   distance + time), muscle group, notes ("seat at 4"), the weight step for suggestions.
   "Add common exercises" creates a starter list in the interface language — never automatic.
   Deleting an exercise that has history archives it; history is kept.
2. **Routines** — ordered exercises, each with sets, a rep range (e.g. 8–10), a starting weight,
   rest time between sets, and warm-up sets (which never count toward records).
3. **Program — customizable per person** (owner's answer, so others can use Itqan differently):
   - *Fixed weekdays*: a routine (or rest) for each day of the week.
   - *Rotation*: routines in order, done whenever you go; a skipped day waits for you. A
     "times per week" target gives the weekly view something to compare against.
4. **Live workout** (phone one-handed, laptop too — both are used for logging):
   start today's routine, another one, or an empty workout; one exercise at a time with today's
   target, last time's sets and effort, set rows prefilled from last time (one tap = done as
   planned); per set: reps, weight / time / distance, and effort (four levels — owner: enough);
   rest timer starting after each set; next / skip / reorder / add an exercise; a note on the
   workout; a finish summary (duration, sets, total weight, new PRs). Every set is saved the
   moment it is ticked; reopening Itqan resumes an unfinished workout.
5. **Progression** — a suggestion for next time per exercise: top of the rep range on every work
   set at Easy/Good → add one step; failed sets two workouts in a row → stay or go down. Only a
   suggestion. PRs per exercise: heaviest weight, most reps at a weight, best workout volume,
   estimated one-rep max.
6. **History** — any day (every set, effort, notes); any exercise (newest first, with a chart of
   weight over time); a calendar of training days; a weekly view (done vs planned, sets per
   muscle group).
7. **Connections** — Today shows today's workout with Start/Resume (or "rest day"); one habit can
   be linked so finishing a workout ticks it (deleting the workout unticks it); a goal can follow
   an exercise (best weight / reps / time) or count workouts; XP and badges for workouts and PRs;
   a short summary in the weekly review; the command bar can start a workout.
8. **Units** — kg by default (owner); lb is a display choice in Settings. History is stored in kg
   and never changes when the unit is switched.
9. **Rules** — a workout belongs to the local day it *started* (after midnight stays on the start
   day); editing a routine never rewrites past workouts; logging the same workout on laptop and
   phone at once keeps every set; offline, synced, backed up, five languages.

## Not in the first version (owner: "that is enough for first version")

Supersets, plate calculator, body weight and measurements, deload weeks, progress photos.

## How it was built (2026-10-20)

- Data and maths: S2-26, S2-27 — `src/lib/types.ts`, `store.ts`, `training.ts`, `trainingStarter.ts`.
- Screen: `src/pages/Training.tsx` routes `#/training[/history|/routines|/exercises|/workout]`;
  tabs and editors in `src/components/training/`; the live workout is `LiveWorkout.tsx`, its rest
  timer `rest.ts` (device-local key `itqan-rest`); display helpers `format.tsx` (`useGymFormat`,
  `beginWorkout` — never two workouts in progress at once).
- Text: `m.gym` (shared vocabulary), `m.training` (tabs and editors), `m.workout` (live workout).
- On the phone the floating "+ task" button is hidden on Training: the effort buttons and the
  rest timer sit where it would be.
- Elsewhere: `TodayCard.tsx` on Today (hidden until Training is set up), goal links in
  `GoalEditor`/`GoalCard`, `weightUnit` in Settings → Profile, the weekly review, Ctrl+K.
