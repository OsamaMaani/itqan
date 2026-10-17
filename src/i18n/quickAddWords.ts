import type { Lang } from './core'

/**
 * The words quick add understands, per language (ADR-024). Authored and tested here — not in the
 * translated catalogs — because a wrong word silently files a task on the wrong day. English
 * always works; the interface language's words are added to it.
 *
 * Phrases may span words ("next week", "dans 3 jours", "بعد 3 أيام") and use {n} for a number.
 * Matching ignores case, accents and Arabic diacritics, and accepts Arabic-Indic digits. A word
 * only counts on its own (not inside another word); Chinese characters count as a word edge, so
 * 明天读书 works without spaces.
 *
 * Leave out short forms that are also ordinary words — French "mer" (sea) for mercredi, Spanish
 * "mar" for martes, Arabic "أحد" (someone) for الأحد — or "Aller à la mer" lands on a Wednesday.
 */
export interface QuickAddWords {
  today: string[]
  tonight: string[]
  tomorrow: string[]
  /** Fixed offsets in days: "après-demain" → 2. */
  relative: Record<string, number>
  /** No day: the task goes to the Inbox. */
  inbox: string[]
  nextWeek: string[]
  inDays: string[]
  inWeeks: string[]
  /** Index 0 = Sunday. Each day can have several spellings; the first is the one hints show. */
  weekdays: string[][]
  /** Words around a weekday that mean nothing more than "the coming" one. */
  weekdayPrefix: string[]
  weekdaySuffix: string[]
  /** After @, e.g. @morning. */
  times: { morning: string[]; afternoon: string[]; evening: string[] }
  /** Time words count without @ too (Chinese writes 明天下午 as one phrase). */
  bareTimes?: boolean
  /** Units after ~ for an estimate: ~30m, ~1h. */
  minutes: string[]
  hours: string[]
  /** "idea: …" in the command bar saves an idea instead of a task. */
  idea: string[]
}

export const QUICK_ADD_WORDS: Record<Lang, QuickAddWords> = {
  en: {
    today: ['today', 'tod'],
    tonight: ['tonight'],
    tomorrow: ['tomorrow', 'tmr', 'tmrw'],
    relative: { 'day after tomorrow': 2 },
    inbox: ['inbox', 'someday'],
    nextWeek: ['next week'],
    inDays: ['in {n} days', 'in {n} day'],
    inWeeks: ['in {n} weeks', 'in {n} week'],
    weekdays: [['sunday'], ['monday'], ['tuesday'], ['wednesday'], ['thursday'], ['friday'], ['saturday']],
    weekdayPrefix: ['next', 'this'],
    weekdaySuffix: [],
    times: { morning: ['morning', 'am'], afternoon: ['afternoon', 'noon'], evening: ['evening', 'night', 'pm'] },
    minutes: ['m', 'min', 'mins', 'minutes'],
    hours: ['h', 'hr', 'hrs', 'hour', 'hours'],
    idea: ['idea'],
  },
  ar: {
    today: ['اليوم'],
    tonight: ['الليلة'],
    tomorrow: ['غدا', 'بكرة', 'بكره'],
    relative: { 'بعد غد': 2, 'بعد بكرة': 2, 'بعد يومين': 2, 'بعد أسبوع': 7, 'بعد أسبوعين': 14 },
    inbox: ['لاحقا', 'الوارد'],
    nextWeek: ['الأسبوع القادم', 'الأسبوع المقبل', 'الأسبوع الجاي'],
    inDays: ['بعد {n} أيام', 'بعد {n} يوم', 'بعد {n} يوما', 'خلال {n} أيام'],
    inWeeks: ['بعد {n} أسابيع', 'بعد {n} أسبوع', 'بعد {n} أسبوعا'],
    weekdays: [['الأحد'], ['الاثنين', 'الإثنين'], ['الثلاثاء'], ['الأربعاء'], ['الخميس'], ['الجمعة'], ['السبت']],
    weekdayPrefix: ['يوم'],
    weekdaySuffix: ['القادم', 'القادمة', 'المقبل', 'المقبلة', 'الجاي'],
    times: { morning: ['صباحا', 'الصباح', 'صباح'], afternoon: ['الظهر', 'ظهرا', 'العصر', 'عصرا'], evening: ['مساء', 'المساء', 'الليل', 'ليلا'] },
    minutes: ['د', 'دقيقة', 'دقائق'],
    hours: ['س', 'ساعة', 'ساعات'],
    idea: ['فكرة'],
  },
  fr: {
    today: ['aujourd’hui', 'auj'],
    tonight: ['ce soir'],
    tomorrow: ['demain'],
    relative: { 'après-demain': 2 },
    inbox: ['plus tard'],
    nextWeek: ['la semaine prochaine', 'semaine prochaine'],
    inDays: ['dans {n} jours', 'dans {n} jour'],
    inWeeks: ['dans {n} semaines', 'dans {n} semaine'],
    weekdays: [['dimanche'], ['lundi'], ['mardi'], ['mercredi'], ['jeudi'], ['vendredi'], ['samedi']],
    weekdayPrefix: ['ce'],
    weekdaySuffix: ['prochain', 'prochaine'],
    times: { morning: ['matin'], afternoon: ['après-midi', 'aprem', 'midi'], evening: ['soir', 'soirée', 'nuit'] },
    minutes: ['min', 'm', 'minutes'],
    hours: ['h', 'heure', 'heures'],
    idea: ['idée'],
  },
  zh: {
    today: ['今天', '今日'],
    tonight: ['今晚'],
    tomorrow: ['明天', '明日'],
    relative: { 后天: 2, 大后天: 3 },
    inbox: ['稍后', '收件箱'],
    nextWeek: ['下周', '下星期', '下礼拜', '下个星期', '下个礼拜'],
    inDays: ['{n}天后', '{n}天之后'],
    inWeeks: ['{n}周后', '{n}个星期后', '{n}个礼拜后'],
    weekdays: [
      ['周日', '星期日', '星期天', '礼拜天'], ['周一', '星期一'], ['周二', '星期二'], ['周三', '星期三'],
      ['周四', '星期四'], ['周五', '星期五'], ['周六', '星期六'],
    ],
    weekdayPrefix: ['下个', '下', '这个', '这', '本'],
    weekdaySuffix: [],
    times: { morning: ['早上', '上午', '早晨'], afternoon: ['下午', '中午'], evening: ['晚上', '傍晚'] },
    bareTimes: true,
    minutes: ['分钟', '分'],
    hours: ['小时', '个小时'],
    idea: ['想法', '点子', '灵感'],
  },
  es: {
    today: ['hoy'],
    tonight: ['esta noche'],
    tomorrow: ['mañana'],
    relative: { 'pasado mañana': 2 },
    inbox: ['algún día', 'más tarde'],
    nextWeek: ['la próxima semana', 'próxima semana', 'la semana que viene', 'semana que viene'],
    inDays: ['en {n} días', 'en {n} día', 'dentro de {n} días'],
    inWeeks: ['en {n} semanas', 'en {n} semana', 'dentro de {n} semanas'],
    weekdays: [['domingo'], ['lunes'], ['martes'], ['miércoles'], ['jueves'], ['viernes'], ['sábado']],
    weekdayPrefix: ['el', 'este', 'próximo'],
    weekdaySuffix: ['próximo', 'que viene'],
    times: { morning: ['mañana'], afternoon: ['tarde', 'mediodía'], evening: ['noche'] },
    minutes: ['min', 'm', 'minutos'],
    hours: ['h', 'hora', 'horas'],
    idea: ['idea'],
  },
}

const sets = new Map<Lang, QuickAddWords[]>()

/** The words quick add accepts while the interface is in `lang`: English plus that language. Same array each call. */
export function quickAddWords(lang: Lang): QuickAddWords[] {
  let set = sets.get(lang)
  if (!set) sets.set(lang, (set = lang === 'en' ? [QUICK_ADD_WORDS.en] : [QUICK_ADD_WORDS.en, QUICK_ADD_WORDS[lang]]))
  return set
}
