import type { Messages } from '../core'

export const time: Messages['time'] = {
  today: 'Hoy',
  tomorrow: 'Mañana',
  yesterday: 'Ayer',
  inDays: { one: 'Dentro de {n} día', other: 'Dentro de {n} días' },
  daysAgo: { one: 'Hace {n} día', other: 'Hace {n} días' },
  minutes: '{m} min',
  hours: '{h} h',
  hoursMinutes: '{h} h {m} min',
}
