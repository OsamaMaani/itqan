import type { Reminder } from './types'
import { REMINDER_ALL_DAY_TIME } from './reminders'

/**
 * Reminders as an iCalendar (.ics) file, so the iPhone's own Calendar can alert — a web app on
 * iOS cannot receive notifications without a push server (ADR-017). Rules are mapped to RRULEs
 * that match src/lib/reminders.ts: a monthly reminder on the 31st and a yearly one on 29 Feb
 * use "last day of the month", which is how Itqan clamps them.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lines longer than 75 octets are folded (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let cur = ''
  let len = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0 }
    cur += ch
    len += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

function utc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function rrule(r: Reminder): string | null {
  const day = Number(r.date.slice(8, 10))
  const month = Number(r.date.slice(5, 7))
  switch (r.repeat) {
    case 'daily': return 'RRULE:FREQ=DAILY'
    case 'weekly': return 'RRULE:FREQ=WEEKLY'
    case 'monthly': return day === 31 ? 'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1' : 'RRULE:FREQ=MONTHLY'
    case 'yearly': return month === 2 && day === 29 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY'
    default: return null
  }
}

function minutes(m: number): string {
  return m < 0 ? `-PT${-m}M` : `PT${m}M`
}

export function toICS(reminders: Reminder[], now: Date = new Date()): string {
  const [ah, am] = REMINDER_ALL_DAY_TIME.split(':').map(Number)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Itqan//Reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Itqan']
  for (const r of reminders) {
    if (r.repeat === 'none' && r.done) continue
    const ymd = r.date.replace(/-/g, '')
    const title = `${r.emoji ? `${r.emoji} ` : ''}${r.title}`
    lines.push('BEGIN:VEVENT', `UID:${r.id}@itqan`, `DTSTAMP:${utc(now)}`, `SUMMARY:${esc(title)}`)
    if (r.notes) lines.push(`DESCRIPTION:${esc(r.notes)}`)
    if (r.time === null) {
      const next = new Date(Number(r.date.slice(0, 4)), Number(r.date.slice(5, 7)) - 1, Number(r.date.slice(8, 10)) + 1)
      lines.push(`DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`)
    } else {
      lines.push(`DTSTART:${ymd}T${r.time.replace(':', '')}00`, 'DURATION:PT30M')
    }
    const rule = rrule(r)
    if (rule) lines.push(rule)
    for (const before of r.alerts.length ? r.alerts : [0]) {
      // All-day events start at midnight; Itqan alerts them at 09:00 on the day.
      const trigger = r.time === null ? ah * 60 + am - before : -before
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, `TRIGGER:${minutes(trigger)}`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Opens the calendar file: iOS shows its “Add to Calendar” sheet; desktops download it. */
export function openICS(reminders: Reminder[], name = 'itqan-reminders'): void {
  const ics = toICS(reminders)
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
    return
  }
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
