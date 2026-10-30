/** Relative days and durations. Dates and weekday names come from Intl, not from here. */
export const time = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  inDays: { one: 'In {n} day', other: 'In {n} days' },
  daysAgo: { one: '{n} day ago', other: '{n} days ago' },
  minutes: '{m}m',
  hours: '{h}h',
  hoursMinutes: '{h}h {m}m',
  /** More than a day: {d} days and {h} hours, e.g. a countdown “1d 3h”. */
  daysHours: '{d}d {h}h',
}
