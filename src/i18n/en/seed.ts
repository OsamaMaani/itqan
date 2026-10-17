/**
 * The starter set offered at onboarding — the owner's routine (memory/00-project.md). Created in
 * the interface language once; after that it is ordinary, editable data.
 */
export const seed = {
  areas: { quran: 'Quran', french: 'French', gym: 'Gym', books: 'Books', courses: 'Courses', life: 'Life' },
  habits: { quran: 'Revise Quran', french: 'French practice', read: 'Read', gym: 'Gym', course: 'Course study' },
  units: { min: 'min', pages: 'pages', juz: 'juz', modules: 'modules' },
  goals: {
    quran: { title: 'Complete a full Quran revision', why: 'Keep what I memorised strong and close to my heart.' },
    french: {
      title: 'Reach French B1',
      why: 'Speak with confidence, not just pass an exam.',
      milestones: ['Finish A2 grammar review', 'Learn 1,000 core words', 'Give 5 oral presentations', 'Pass a B1 mock exam'],
    },
    book: { title: 'Finish my current book', why: 'Edit the title and page count to match the book.' },
    course: { title: 'Finish my current course', why: 'Edit to match the course you are studying.' },
  },
  tasks: {
    tour: 'Tour Itqan: press Ctrl+K (or the + button) to add a task',
    editGoals: 'Edit the starter goals so they match your real books, courses and targets',
    focus: 'Try one 25-minute focus session',
    gym: 'Gym session',
  },
}
