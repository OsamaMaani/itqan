import { describe, expect, it } from 'vitest'
import { quickAddWords } from '../../i18n/quickAddWords'
import { ideaText, noteText, parseQuickAdd } from '../quickAdd'
import type { Area } from '../types'

const areas: Area[] = [
  { id: 'books', name: 'Books', emoji: '', color: 'amber', archived: false, createdAt: '' },
  { id: 'quran', name: 'Quran', emoji: '', color: 'emerald', archived: false, createdAt: '' },
  { id: 'arch', name: 'Old', emoji: '', color: 'slate', archived: true, createdAt: '' },
]
const today = '2026-10-16' // Friday

describe('quick add', () => {
  it('parses everything at once', () => {
    expect(parseQuickAdd('Read 30 pages #books !2 tomorrow @evening ~30m', areas, today)).toEqual({
      title: 'Read 30 pages', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
  })
  it('leaves date undefined when none is given', () => {
    expect(parseQuickAdd('Call mum', areas, today).date).toBeUndefined()
  })
  it('matches area prefixes case-insensitively, but not archived areas', () => {
    expect(parseQuickAdd('Revise #qur', areas, today).areaId).toBe('quran')
    expect(parseQuickAdd('x #old', areas, today)).toMatchObject({ areaId: null, title: 'x #old' })
  })
  it('weekdays mean the next occurrence, never today', () => {
    expect(parseQuickAdd('Gym saturday', areas, today).date).toBe('2026-10-17')
    expect(parseQuickAdd('Gym friday', areas, today).date).toBe('2026-10-23')
  })
  it('understands relative phrases', () => {
    expect(parseQuickAdd('a in 3 days', areas, today).date).toBe('2026-10-19')
    expect(parseQuickAdd('a in 2 weeks', areas, today).date).toBe('2026-10-30')
    expect(parseQuickAdd('a next week', areas, today, 6).date).toBe('2026-10-17')
    expect(parseQuickAdd('a someday', areas, today).date).toBeNull()
    expect(parseQuickAdd('a tonight', areas, today)).toMatchObject({ date: today, timeOfDay: 'evening' })
  })
  it('+project puts the task in a project and takes its area, but not done/archived projects', () => {
    const projects = [
      { id: 'p1', title: 'Portfolio site', areaId: 'books', status: 'active' },
      { id: 'p2', title: 'Old thing', areaId: null, status: 'done' },
    ] as never[]
    expect(parseQuickAdd('Write about page +portfolio', areas, today, 6, projects)).toMatchObject({ title: 'Write about page', projectId: 'p1', areaId: 'books' })
    expect(parseQuickAdd('x +old', areas, today, 6, projects)).toMatchObject({ projectId: null, title: 'x +old' })
    expect(parseQuickAdd('2 + 2', areas, today, 6, projects).title).toBe('2 + 2')
  })
  it('hours estimate', () => {
    expect(parseQuickAdd('Study ~1.5h', areas, today).estimateMin).toBe(90)
  })
  it('keeps unrelated words such as "in" in the title', () => {
    expect(parseQuickAdd('Sign in to portal', areas, today).title).toBe('Sign in to portal')
  })
})

describe('quick add in other languages (ADR-024)', () => {
  const w = (lang: Parameters<typeof quickAddWords>[0]) => quickAddWords(lang)
  const p = (text: string, lang: Parameters<typeof quickAddWords>[0]) => parseQuickAdd(text, areas, today, 6, [], w(lang))

  it('English still works in every language', () => {
    for (const lang of ['ar', 'fr', 'zh', 'es'] as const) {
      expect(p('Read #books tomorrow !2', lang)).toMatchObject({ title: 'Read', areaId: 'books', priority: 2, date: '2026-10-17' })
    }
  })
  it('only the interface language is added — French words mean nothing in Spanish', () => {
    expect(p('Lire demain', 'es')).toMatchObject({ title: 'Lire demain', date: undefined })
  })

  it('French', () => {
    expect(p('Lire 20 pages #books demain !2 @soir ~30min', 'fr')).toEqual({
      title: 'Lire 20 pages', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
    expect(p('Appeler maman aujourd’hui', 'fr').date).toBe(today)
    expect(p("Appeler maman aujourd'hui", 'fr').date).toBe(today) // straight apostrophe too
    expect(p('Sport ce soir', 'fr')).toMatchObject({ title: 'Sport', date: today, timeOfDay: 'evening' })
    expect(p('Rapport dans 3 jours', 'fr')).toMatchObject({ title: 'Rapport', date: '2026-10-19' })
    expect(p('Rapport dans 2 semaines', 'fr').date).toBe('2026-10-30')
    expect(p('Courses lundi prochain', 'fr')).toMatchObject({ title: 'Courses', date: '2026-10-19' })
    expect(p('Courses VENDREDI', 'fr').date).toBe('2026-10-23') // never today
    expect(p('Dentiste après-demain', 'fr').date).toBe('2026-10-18')
    expect(p('Voyage la semaine prochaine', 'fr')).toMatchObject({ title: 'Voyage', date: '2026-10-17' })
    expect(p('Étudier ~1,5h @après-midi', 'fr')).toMatchObject({ estimateMin: 90, timeOfDay: 'afternoon' })
    expect(p('Idées plus tard', 'fr')).toMatchObject({ title: 'Idées', date: null })
  })
  it('French: ordinary words are not days', () => {
    expect(p('Aller à la mer', 'fr')).toMatchObject({ title: 'Aller à la mer', date: undefined })
    expect(p('Acheter un jeu', 'fr').date).toBeUndefined()
    expect(p('Prendre un jour de congé', 'fr').date).toBeUndefined()
  })
  it('French: punctuation stuck to a day word goes with it', () => {
    expect(p('Appeler maman demain !', 'fr')).toMatchObject({ title: 'Appeler maman', priority: 1 }) // a lone ! is a priority
    expect(p('Appeler maman demain!', 'fr')).toMatchObject({ title: 'Appeler maman', priority: 0, date: '2026-10-17' })
  })

  it('Spanish', () => {
    expect(p('Leer 20 páginas #books mañana !2 @noche ~30min', 'es')).toEqual({
      title: 'Leer 20 páginas', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
    expect(p('Gimnasio esta noche', 'es')).toMatchObject({ title: 'Gimnasio', date: today, timeOfDay: 'evening' })
    expect(p('Correr @mañana', 'es')).toMatchObject({ title: 'Correr', timeOfDay: 'morning', date: undefined }) // @mañana is a time, not tomorrow
    expect(p('Médico pasado mañana', 'es')).toMatchObject({ title: 'Médico', date: '2026-10-18' })
    expect(p('Informe en 3 días', 'es').date).toBe('2026-10-19')
    expect(p('Informe dentro de 2 semanas', 'es').date).toBe('2026-10-30')
    expect(p('Leer el libro el próximo lunes', 'es')).toMatchObject({ title: 'Leer el libro', date: '2026-10-19' })
    expect(p('Compras el martes que viene', 'es')).toMatchObject({ title: 'Compras', date: '2026-10-20' })
    expect(p('Viaje la semana que viene', 'es')).toMatchObject({ title: 'Viaje', date: '2026-10-17' })
    expect(p('Leer manana', 'es').date).toBe('2026-10-17') // typed without the tilde
    expect(p('Ir al mar', 'es').date).toBeUndefined()
  })

  it('Arabic', () => {
    expect(p('اقرأ 20 صفحة #books غدا !2 @مساء ~30د', 'ar')).toEqual({
      title: 'اقرأ 20 صفحة', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
    expect(p('اتصل بأمي غداً', 'ar')).toMatchObject({ title: 'اتصل بأمي', date: '2026-10-17' }) // with tanween
    expect(p('مراجعة بعد ٣ أيام', 'ar')).toMatchObject({ title: 'مراجعة', date: '2026-10-19' }) // Arabic-Indic digits
    expect(p('مراجعة بعد 2 أسابيع', 'ar').date).toBe('2026-10-30')
    expect(p('موعد بعد يومين', 'ar')).toMatchObject({ title: 'موعد', date: '2026-10-18' })
    expect(p('موعد بعد غد', 'ar').date).toBe('2026-10-18')
    expect(p('تسوق يوم الاثنين القادم', 'ar')).toMatchObject({ title: 'تسوق', date: '2026-10-19' })
    expect(p('تسوق الإثنين', 'ar').date).toBe('2026-10-19')
    expect(p('رياضة الليلة', 'ar')).toMatchObject({ title: 'رياضة', date: today, timeOfDay: 'evening' })
    expect(p('سفر الأسبوع القادم', 'ar')).toMatchObject({ title: 'سفر', date: '2026-10-17' })
    expect(p('اسأل أحد الأصدقاء', 'ar').date).toBeUndefined() // أحد = someone, not Sunday
    expect(p('فكرة لاحقا', 'ar')).toMatchObject({ title: 'فكرة', date: null })
  })

  it('Chinese, with and without spaces', () => {
    expect(p('读20页 #books 明天 !2 @晚上 ~30分钟', 'zh')).toEqual({
      title: '读20页', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
    expect(p('明天下午读书', 'zh')).toMatchObject({ title: '读书', date: '2026-10-17', timeOfDay: 'afternoon' })
    expect(p('去明天超市', 'zh').title).toBe('去超市')
    expect(p('今晚健身', 'zh')).toMatchObject({ title: '健身', date: today, timeOfDay: 'evening' })
    expect(p('交报告3天后', 'zh')).toMatchObject({ title: '交报告', date: '2026-10-19' })
    expect(p('三天后交报告', 'zh').date).toBe('2026-10-19')
    expect(p('两周后体检', 'zh').date).toBe('2026-10-30')
    expect(p('十天后', 'zh').date).toBe('2026-10-26')
    expect(p('下周一开会', 'zh')).toMatchObject({ title: '开会', date: '2026-10-19' }) // not "next week" + 一
    expect(p('星期六爬山', 'zh').date).toBe('2026-10-17')
    expect(p('下周旅行', 'zh')).toMatchObject({ title: '旅行', date: '2026-10-17' })
    expect(p('后天看牙', 'zh').date).toBe('2026-10-18')
    expect(p('学习 ~2个小时', 'zh').estimateMin).toBe(120)
    expect(p('读书 ２０２６-１０-２０', 'zh').date).toBe('2026-10-20') // full-width digits
  })
  it('a day word inside a #tag stays part of the tag', () => {
    const zhAreas: Area[] = [{ id: 'plan', name: '明天计划', emoji: '', color: 'sky', archived: false, createdAt: '' }]
    expect(parseQuickAdd('写 #明天计划', zhAreas, today, 6, [], w('zh'))).toMatchObject({ areaId: 'plan', date: undefined, title: '写' })
  })

  it('idea: works in each language', () => {
    expect(ideaText('idea: a kettle')).toBe('a kettle')
    expect(ideaText('Idea a kettle')).toBe('a kettle')
    expect(ideaText('ideas for later')).toBeNull()
    expect(ideaText('idée : une bouilloire', w('fr'))).toBe('une bouilloire')
    expect(ideaText('Idee: une bouilloire', w('fr'))).toBe('une bouilloire')
    expect(ideaText('فكرة: غلاية', w('ar'))).toBe('غلاية')
    expect(ideaText('想法：烧水壶', w('zh'))).toBe('烧水壶')
    expect(ideaText('idea:', w('es'))).toBe('')
  })

  it('note: needs its colon, in each language — "Note the time" stays a task', () => {
    expect(noteText('note: gate code 4512')).toBe('gate code 4512')
    expect(noteText('Note : gate code')).toBe('gate code')
    expect(noteText('Note the meeting time')).toBeNull()
    expect(noteText('notes: x')).toBeNull()
    expect(noteText('ملاحظة: رمز البوابة', w('ar'))).toBe('رمز البوابة')
    expect(noteText('note\u00a0: code du portail', w('fr'))).toBe('code du portail')
    expect(noteText('笔记：门禁密码', w('zh'))).toBe('门禁密码')
    expect(noteText('记：买牛奶', w('zh'))).toBe('买牛奶')
    expect(noteText('nota: código', w('es'))).toBe('código')
    expect(noteText('note: in English while in Spanish', w('es'))).toBe('in English while in Spanish')
    expect(ideaText('note: a kettle')).toBeNull()
  })
})

describe('quick add: numbers apart from Chinese words', () => {
  it('"3 天后" works like "3天后"', () => {
    expect(parseQuickAdd('交报告 3 天后', areas, today, 6, [], quickAddWords('zh'))).toMatchObject({ title: '交报告', date: '2026-10-19' })
  })
})
