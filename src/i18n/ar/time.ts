import type { Messages } from '../core'

export const time: Messages['time'] = {
  today: 'اليوم',
  tomorrow: 'غدًا',
  yesterday: 'أمس',
  inDays: { zero: 'اليوم', one: 'بعد يوم', two: 'بعد يومين', few: 'بعد {n} أيام', many: 'بعد {n} يومًا', other: 'بعد {n} يوم' },
  daysAgo: { zero: 'اليوم', one: 'قبل يوم', two: 'قبل يومين', few: 'قبل {n} أيام', many: 'قبل {n} يومًا', other: 'قبل {n} يوم' },
  minutes: '{m} د',
  hours: '{h} س',
  hoursMinutes: '{h} س {m} د',
}
