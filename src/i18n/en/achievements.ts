export const achievements = {
  categories: {
    career: 'Career', education: 'Education', learning: 'Learning & certificates', health: 'Health & fitness',
    faith: 'Faith', languages: 'Languages', projects: 'Projects & building', personal: 'Personal growth',
    family: 'Family & friends', creative: 'Creative', finance: 'Finance', community: 'Community & giving',
  },
  impact: { small: 'Small win', notable: 'Notable', major: 'Major' },
  /** Suggested achievement titles. {title} is a project's title; {name} a habit's name. */
  finished: 'Finished: {title}',
  streakDays: { one: '{name}: {n} day in a row', other: '{name}: {n} days in a row' },
  streakWeeks: { one: '{name}: {n} week in a row', other: '{name}: {n} weeks in a row' },
  focusHours: { one: '{n} hour of deep focus', other: '{n} hours of deep focus' },
  /** The plain-text export. {year} is a year like 2026. */
  exportTitle: 'Achievements {year}',
  exportEmpty: '(none yet)',

  subtitle: 'What you have done, year by year — for the days you forget how far you have come.',
  export: 'Export',
  addAchievement: 'Add achievement',
  /** A year tab: {year} is the year, {n} how many achievements it has. */
  yearTab: '{year} · {n}',
  /** Heading of the year summary; {year} is a year like 2026. */
  yearInReview: '{year} in review',
  /** The word shown next to the big number of achievements in a year (the number itself is shown separately). */
  countLabel: { one: 'achievement', other: 'achievements' },
  majorCount: { one: '{n} major', other: '{n} major' },
  /** {year} is the previous year. */
  sameAsYear: 'Same as {year}',
  /** {delta} is a signed number like +3 or -2; {year} is the previous year. */
  deltaVs: '{delta} vs {year}',
  highlights: 'Highlights',
  noticed: 'Wins Itqan noticed',
  /** Under a suggested win: {date} is a short date, {category} the category name. */
  suggestionMeta: '{date} · {category}',
  suggestionAdd: 'Add',
  notAnAchievement: 'Not an achievement',
  searchPlaceholder: 'Search achievements',
  /** A category filter chip: {category} is the name, {n} how many achievements. */
  categoryChip: '{category} · {n}',
  /** {year} is a year like 2026. */
  emptyYearTitle: 'Nothing recorded for {year} yet',
  emptyYearBody: 'Promotions, certificates, a finished juz, a race, a hard conversation handled well — big or small, write it down. Future you will be glad.',
  noMatch: 'Nothing matches',
  removeHighlight: 'Remove highlight',
  highlight: 'Highlight',

  editor: {
    title: 'Achievement',
    newTitle: 'New achievement',
    record: 'Record it',
    recorded: 'Achievement recorded · +5 XP',
    deleted: 'Achievement deleted',
    titlePlaceholder: 'What did you achieve?',
    category: 'Category',
    custom: 'Custom…',
    customPlaceholder: 'e.g. Hackathons',
    when: 'When',
    howBig: 'How big?',
    story: 'The story',
    storyPlaceholder: 'What it took, who helped, why it matters…',
    proof: 'Proof & links',
    proofHint: 'certificate, article, repo…',
    linkLabel: 'Label',
    linkUrl: 'https://…',
    goal: 'Goal',
    project: 'Project',
    tagsPlaceholder: 'cv, linkedin',
  },

  exportModal: {
    /** {year} is a year like 2026. */
    title: 'Export {year}',
    download: 'Download .txt',
    copied: 'Copied — paste it into your CV or LinkedIn',
    copyFailed: 'Copy failed — select the text and copy it by hand',
  },
}
