export const connections = {
  cadence: {
    none: 'No rhythm',
    /** A rhythm of exactly one unit (“Every week”, not “Every 1 week”); larger counts use the plurals below. */
    every: { days: 'Every day', weeks: 'Every week', months: 'Every month', years: 'Every year' },
    days: { one: 'Every day', other: 'Every {n} days' },
    weeks: { one: 'Every week', other: 'Every {n} weeks' },
    months: { one: 'Every month', other: 'Every {n} months' },
    years: { one: 'Every year', other: 'Every {n} years' },
  },
  kinds: { call: 'Call', message: 'Message', meet: 'Met up', email: 'Email', other: 'Other' },

  /** The groups a person can belong to. */
  circles: { family: 'Family', friend: 'Friends', university: 'University', work: 'Work', mentor: 'Mentors', other: 'Other' },

  /** Status line under a person's name. */
  due: {
    noRhythm: 'No rhythm set',
    /** {when} is Today / Yesterday / a weekday / a short date, in lower case. */
    lastTalked: 'Last talked {when}',
    overdueBy: { one: 'Overdue by {n} day', other: 'Overdue by {n} days' },
    today: 'Check in today',
    tomorrow: 'Next check-in tomorrow',
    inDays: { one: 'Next check-in in {n} day', other: 'Next check-in in {n} days' },
  },
  last: {
    never: 'never logged',
    today: 'last talked today',
    yesterday: 'last talked yesterday',
    daysAgo: { one: 'last talked {n} day ago', other: 'last talked {n} days ago' },
    monthsAgo: { one: 'last talked {n} month ago', other: 'last talked {n} months ago' },
    yearsAgo: { one: 'last talked {n} year ago', other: 'last talked {n} years ago' },
  },

  list: {
    title: 'Connections',
    people: { one: '{n} person', other: '{n} people' },
    toReachOut: { one: '{n} to reach out to', other: '{n} to reach out to' },
    subtitleEmpty: 'The people who matter — and a gentle nudge to stay in touch.',
    addPerson: 'Add person',
    emptyTitle: 'Add the people you care about',
    emptyBody: 'Family, friends, university and work colleagues. Choose how often you want to check in with each — Itqan tells you when it is time.',
    reachOut: 'Reach out · {n}',
    checkedIn: 'Checked in',
    snoozeWeek: 'Snooze a week',
    /** {name} is a person; shown after snoozing their check-in for a week. */
    snoozedToast: '{name}: in a week',
    birthdays: 'Birthdays · next 30 days',
    /** {date} is a date, {age} the age they turn. */
    dateTurns: '{date} · turns {age}',
    /** Days until a birthday, in a few characters: “3d”. */
    daysShort: { one: '{n}d', other: '{n}d' },
    searchPlaceholder: 'Search people, companies, tags',
    allCount: 'All · {n}',
    circleCount: '{circle} · {n}',
    nobody: 'Nobody matches',
  },

  detail: {
    notFound: 'Person not found',
    notFoundBody: 'They may have been removed on another device.',
    removeFavourite: 'Remove from favourites',
    /** {name} is a person. Shown before deleting them. */
    removeConfirm: 'Remove {name}? Their check-in history and birthday reminder are deleted too.',
    logCheckIn: 'Log a check-in',
    remindMe: 'Remind me…',
    actions: { call: 'Call', message: 'Message', whatsapp: 'WhatsApp', email: 'Email', profile: 'Profile' },
    stayingInTouch: 'Staying in touch',
    snoozeOneWeek: 'Snooze 1 week',
    snoozedToast: 'Snoozed for a week',
    rhythmLabel: 'Check-in rhythm',
    birthdayToday: 'Birthday today!',
    birthdayIn: { one: 'Birthday in {n} day', other: 'Birthday in {n} days' },
    about: 'About',
    phone: 'Phone',
    email: 'Email',
    howWeMet: 'How we met',
    /** {name} is a person’s first name. */
    remindersAbout: 'Reminders about {name}',
    history: 'History · {n}',
    log: 'Log',
    noCheckIns: 'No check-ins yet',
    noCheckInsBody: 'Log calls, messages and meetups here — with a note of what you talked about.',
    deleteCheckIn: 'Delete check-in',
    /** Title of the reminder created from a person’s page. {name} is their first name; the person types the rest. */
    talkTo: 'Talk to {name}: ',
  },

  birthday: {
    removed: 'Birthday reminder removed',
    added: 'You’ll be reminded on the day and a week before',
    reminding: 'Reminding',
    remindMe: 'Remind me',
  },

  log: {
    /** {name} is a person; {xp} the XP earned. */
    toast: 'Checked in with {name} · +{xp} XP',
    title: 'Check-in with {name}',
    save: 'Save check-in',
    how: 'How?',
    when: 'When',
    whatTalked: 'What did you talk about?',
    notePlaceholder: 'News, plans, anything to follow up on…',
  },

  editor: {
    /** {name} is the new person. */
    added: '{name} added',
    editTitle: 'Edit person',
    addTitle: 'Add a person',
    addButton: 'Add person',
    name: 'Name',
    namePlaceholder: 'Full name',
    circle: 'Circle',
    checkIn: 'Check in',
    lastTalk: 'Last time we talked',
    phoneHint: 'with country code, e.g. +20…',
    role: 'Role',
    rolePlaceholder: 'e.g. Classmate, Team lead',
    company: 'Company / university',
    profileLink: 'Profile link',
    profileHint: 'LinkedIn, Instagram…',
    birthday: 'Birthday',
    yearUnknown: 'Year unknown',
    remindMe: 'Remind me',
    howWeMetPlaceholder: 'e.g. Engineering faculty, 2017',
    tagsHint: 'comma separated',
    tagsPlaceholder: 'gym, french, mentor',
    notesPlaceholder: 'Kids’ names, favourite things, gift ideas…',
  },
}
