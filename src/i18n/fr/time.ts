import type { Messages } from '../core'

export const time: Messages['time'] = {
  today: 'Aujourd’hui',
  tomorrow: 'Demain',
  yesterday: 'Hier',
  inDays: { one: 'Dans {n} jour', other: 'Dans {n} jours' },
  daysAgo: { one: 'Il y a {n} jour', other: 'Il y a {n} jours' },
  minutes: '{m}\u00a0min',
  hours: '{h}\u00a0h',
  hoursMinutes: '{h}\u00a0h\u00a0{m}\u00a0min',
}
