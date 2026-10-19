/**
 * The starter set offered at onboarding — a generic example, not anyone's real routine (ADR-025).
 * Created in the interface language once; after that it is ordinary, editable data.
 */
export const seed = {
  areas: { health: 'Health', mind: 'Mind', learning: 'Learning', books: 'Books', work: 'Work', life: 'Life' },
  habits: { water: 'Drink water', read: 'Read', meditate: 'Meditate', exercise: 'Exercise', learn: 'Practise a skill' },
  units: { min: 'min', pages: 'pages', glasses: 'glasses', books: 'books', modules: 'modules' },
  goals: {
    books: { title: 'Read 12 books this year', why: 'A little every day adds up to a lot.' },
    run: {
      title: 'Run 5 km',
      why: 'Build stamina one small step at a time.',
      milestones: ['Walk 30 minutes, three times a week', 'Run 1 km without stopping', 'Run 3 km', 'Run 5 km'],
    },
    skill: {
      title: 'Learn a new skill',
      why: 'Grow a little every week.',
      milestones: ['Choose the skill and one good resource', 'Practise for 10 hours', 'Make something small with it', 'Share or teach what you learned'],
    },
    course: { title: 'Finish an online course', why: 'Edit it to match a course you are taking — or delete it.' },
  },
  tasks: {
    tour: 'Tour Itqan: press Ctrl+K (or the + button) to add a task',
    editGoals: 'Edit the example goals so they match your real targets — or delete them',
    focus: 'Try one 25-minute focus session',
    walk: 'Take a 20-minute walk',
  },
}
