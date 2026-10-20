# 10 — Localization

Itqan speaks English, Arabic, French, Simplified Chinese and Spanish (ADR-024). This file is two
things: **how the code handles language** (for whoever writes a screen), and **how each language
is written** (for whoever writes or reviews a translation). Both are enforced in part by
`src/i18n/__tests__/catalogs.test.ts`; the rest is on the writer.

## Part 1 — How it works in code

```
src/i18n/
├── core.ts            <- the I18n API (no React): f, p, d, n, pct, dur, relDay, hijri, weekdays, list
├── react.tsx          <- useI18n(), rich(), language loading, <html lang dir>
├── quickAddWords.ts   <- words quick add understands per language (authored + tested here)
├── en/                <- the source catalog, one file per screen; defines the Messages type
└── ar/ fr/ zh/ es/    <- translations, same files and keys; loaded on demand
```

### Rules for every string a person can read

1. **No literal text in components.** Every visible string, `title`, `aria-label`, placeholder,
   toast, `confirm()` and error message comes from the catalog: `const t = useI18n(); const { m } = t`.
   Lib code (no hooks) takes `t: I18n = tx()` as its last parameter.
2. **One sentence = one message.** Never glue pieces (`'Delete ' + name + '?'`). Use placeholders:
   `deleteConfirm: 'Delete “{name}” and all its history?'` → `t.f(m.habits.deleteConfirm, { name })`.
   Word order differs per language; only a whole sentence can be translated.
3. **Counts are plurals, never `(s)`.** `{ one: '{n} task', other: '{n} tasks' }` → `t.p(pl, n)`.
   Add only `one`/`other` in English; translators add the forms their language needs
   (Arabic: zero, one, two, few, many, other; Chinese: other only).
4. **React nodes inside a sentence** use `rich(m.x.y, { link: <button…>{m.x.linkText}</button> })`
   so the button stays inside the translatable sentence.
5. **Dates, times, numbers, percentages, durations** go through `t.d(date, preset)`, `t.time(hhmm)`,
   `t.n()`, `t.pct()`, `t.dur(min)`, `t.relDay(days)`, `t.weekdays()`, `t.list()`. Never date-fns
   `format()` for display (date-fns stays for date maths). Never hand-build "Oct 17".
   A year passed to `t.f` is a string (`String(year)`), or it is formatted as "2,026".
6. **Direction.** Use logical Tailwind utilities — `ms-/me-/ps-/pe-/start-/end-/text-start/
   text-end/border-s/border-e/rounded-s/rounded-e` — never `ml-/mr-/pl-/pr-/left-/right-/
   text-left/text-right`. Icons that point (chevrons, arrows, "next") get `rtl:-scale-x-100` (or
   `rtl:rotate-180`); motion `x` offsets that slide sideways are multiplied by `t.dir === 'rtl' ? -1 : 1`.
   Clocks, numbers, code and keyboard shortcuts that must read left to right get `dir="ltr"`.
7. **Typography** that only suits Latin script is neutralised in CSS for Arabic and Chinese
   (letter-spacing, italics). Don't fight it with per-language classes.
8. **The owner's data is never translated.** Area names, task titles, habit units are theirs. Text
   Itqan *writes into* data (the starter set, a birthday reminder title) is written in the
   language active at that moment and then belongs to the owner.
9. **Keys** are camelCase, named for meaning not position (`deleteConfirm`, not `text3`). Put a
   `/** comment */` above any message whose placeholders or context aren't obvious — translators
   see only the catalog.
10. **`common`** holds words that mean exactly the same everywhere (Save, Cancel, Delete…). If the
    word could be translated differently in another context, give it its own key. "None" in a
    picker is `common.none.<thing>`: French and Spanish agree it in gender (Aucune tâche, Aucun objectif).
11. **Lessons from the S2-23 review** — each was a real bug in some language:
    - *Exactly one* is not a plural form. Chinese has only `other`, and French `one` also covers 0,
      so "every week" (vs "every 2 weeks") needs its own message (`connections.cadence.every`).
      Likewise a count of 0 that reads oddly gets its own message (`projects.deleteConfirmEmpty`).
    - A label shown under a bare number (`habits.dayStreak`) must read right under any number —
      word it so it doesn't agree with the count, or make it a plural and pass the count.
    - A sign at the start of a string ("+5 XP", "+10%") jumps to the far side in RTL: wrap the
      text in `<bdi>` or `dir="ltr"`, or format signed numbers with `t.n(x, { signDisplay: 'exceptZero' })`
      (Intl adds the direction mark in Arabic).
    - Labels of English-only UIs (GitHub's token page) stay in English, with a gloss in brackets,
      so the person can find them. Their words are in the test's `KEEP_LATIN`.

### Adding a string

Add it to `src/i18n/en/<screen>.ts`, use it, then add it to the four translations. The catalog
test fails until every language has every key with the same placeholders.

### Adding a language

Add the code to `UI_LANGUAGES` (types.ts), `LANG_INFO` (core.ts), the loader in react.tsx, a
folder under `src/i18n/`, its words in `quickAddWords.ts`, its section in Part 2 below, and its
meanings in the daily-card content.

## Part 2 — How each language is written

General principles, every language: **clear before clever, short before complete, the person's
words before the app's.** Buttons say what happens. Errors say what went wrong and what to do.
Never blame. No exclamation marks except to celebrate. Itqan is calm, warm and respectful — a
companion for someone building habits around faith, study and health; never a nag, never
cutesy, never corporate.

### English (source)

- Sentence case everywhere ("Weekly review", not "Weekly Review"). Buttons are verbs.
- Address the person as "you". No "please" on buttons; no "Oops".
- Curly quotes “ ” and apostrophe ’; ellipsis character … for placeholders and "Loading…".
- Write so it can be translated: no puns, idioms or culture-bound jokes; avoid phrasal-verb
  ambiguity; don't reuse one string in two grammatical roles.

### العربية — Arabic

- **Register:** clear Modern Standard Arabic (فصحى ميسّرة) — the language of a well-made Arabic app,
  not dialect, not classical ornament. Warm and dignified.
- **Address:** buttons and menu items use the verbal noun (المصدر): حفظ، إلغاء، حذف، إضافة مهمة —
  neutral and conventional. Sentences that must address the person use the masculine singular
  imperative/second person, the standard default in Arabic software; prefer impersonal phrasing
  where it reads naturally.
- **Punctuation:** Arabic comma ، semicolon ؛ question mark ؟. Quotes «…» (they mirror correctly in
  RTL; “…” do not). No space before punctuation. Ellipsis …
- **Numbers:** Western digits 0–9 (the owner's choice); Intl formats them with `ar-u-nu-latn`.
  Quran verse numbers keep ١٢٣ (daily card only).
- **Plurals:** all six forms where the sentence has a count. For 1 and 2, Arabic says the noun
  alone or the dual instead of a digit: one `يوم واحد` or `يوم`, two `يومان` (not "2 يوم").
  3–10 take the plural noun (`3 أيام`), 11–99 the singular accusative (`11 يومًا`), 100+ the
  singular (`100 يوم`). zero: `لا … ` or the plural, whichever reads naturally.
- **Direction:** text is right-to-left; Latin words, numbers, times and `#tags` inside a sentence
  are fine — the bidi algorithm handles them. Don't add LRM/RLM marks by hand.
- **Style:** no tatweel (ـ), no italics, no letter-spacing, no capital-letter emphasis (there is
  none). Diacritics only where a word would otherwise be misread. Avoid literal calques of English
  idioms; prefer the natural Arabic phrasing.
- The app name is **إتقان** in Arabic text, **Itqan** elsewhere.

### Français — French

- **Address:** *tu* — Itqan is a personal companion, not an administration. Consistent everywhere.
- **Buttons and actions:** infinitive (`Enregistrer`, `Annuler`, `Ajouter une tâche`). Titles in
  sentence case (`Bilan de la semaine`). Accents on capitals (`À`, `É`).
- **Typography:** narrow no-break space U+202F before `; ! ?` and inside `« »`; no-break space
  U+00A0 before `:` and between a number and its unit (`20 min`). Apostrophe ’, guillemets
  « » for quotes, ellipsis …. Days and months lower case.
- **Inclusive without clutter:** avoid gendered forms when a neutral one exists
  (`Bienvenue`, not `Bienvenu·e`); no midpoint inclusive writing.
- Prefer French words over anglicisms where they are natural (`courriel` is too formal —
  `e-mail` is fine; `sauvegarde`, not `backup`).

### 简体中文 — Simplified Chinese

- **Address:** 你 (not 您) — friendly and direct, as in modern personal apps.
- **Punctuation:** full-width ，。：；！？（）“” inside Chinese text. No full stop at the end of
  buttons, labels or short hints. Ellipsis … in placeholders.
- **Spacing:** a half-width space between Chinese and Latin letters or digits (`3 个任务`,
  `连续 7 天`, `同步到 GitHub`), none between Chinese characters, none next to full-width
  punctuation.
- **Concise:** Chinese UI text is short — drop pronouns and connectives the context makes
  obvious. Buttons are two to four characters where possible (保存、取消、删除、添加任务).
- **Plurals:** none — one `other` form. Use the right measure word (个、项、天、次、本).
- No italics, no letter-spacing (CSS neutralises them), no English-style title case.

### Español — Spanish

- **Address:** *tú*, consistently. Neutral international Spanish: avoid regionalisms; the date
  and number format is es-ES.
- **Buttons and actions:** infinitive (`Guardar`, `Cancelar`, `Añadir tarea`). Sentence case.
- **Punctuation:** opening ¿ and ¡ always; quotes «…»; ellipsis …. Decimal comma comes from Intl.
  Days and months lower case.
- **Inclusive without clutter:** prefer neutral phrasing (`Te damos la bienvenida`, `Hola`)
  over gendered forms (`Bienvenido`); no `@` or `x` endings.

## Part 3 — Glossary

One concept, one word, everywhere in a language. A reviewer who sees a different word for a
glossary term flags it.

| English | العربية | Français | 简体中文 | Español |
|---|---|---|---|---|
| Today (screen) | اليوم | Aujourd’hui | 今天 | Hoy |
| Plan (screen) | الخطة | Planning | 计划 | Plan |
| Inbox (unscheduled tasks) | الوارد | Boîte de réception | 收件箱 | Bandeja de entrada |
| Task | مهمة | tâche | 任务 | tarea |
| Subtask | مهمة فرعية | sous-tâche | 子任务 | subtarea |
| Habit | عادة | habitude | 习惯 | hábito |
| Streak | سلسلة | série | 连续天数 | racha |
| Goal | هدف | objectif | 目标 | objetivo |
| Milestone | مرحلة | étape | 里程碑 | hito |
| Project | مشروع | projet | 项目 | proyecto |
| Focus (session) | جلسة تركيز | session de concentration | 专注 | sesión de concentración |
| Idea | فكرة | idée | 想法 | idea |
| Reminder | تذكير | rappel | 提醒 | recordatorio |
| Connections (screen) | العلاقات | Relations | 联系人 | Contactos |
| Check-in (with a person) | تواصل | prise de nouvelles | 联系 | contacto |
| Memory | ذكرى | souvenir | 回忆 | recuerdo |
| Achievement (real life) | إنجاز | réussite | 成就 | logro |
| Badge (game) | وسام | badge | 徽章 | insignia |
| Insights (screen) | الإحصاءات | Statistiques | 统计 | Estadísticas |
| Weekly review | المراجعة الأسبوعية | bilan de la semaine | 每周回顾 | revisión semanal |
| Settings | الإعدادات | Réglages | 设置 | Ajustes |
| Area (of life) | مجال | domaine | 领域 | área |
| XP | XP | XP | XP | XP |
| Level | المستوى | niveau | 等级 | nivel |
| Intention (of the day) | نية اليوم | intention du jour | 今日意图 | intención del día |
| Mood | المزاج | humeur | 心情 | ánimo |
| Backup | نسخة احتياطية | sauvegarde | 备份 | copia de seguridad |
| Sync | مزامنة | synchronisation | 同步 | sincronización |
| Priority | الأولوية | priorité | 优先级 | prioridad |
| Estimate | المدة المتوقعة | durée estimée | 预计用时 | duración estimada |
| Daily card | بطاقة اليوم | carte du jour | 每日卡片 | tarjeta del día |
| Word of the day | كلمة اليوم | mot du jour | 每日一词 | palabra del día |

**Training (ADR-027)** — added 2026-10-20:

| English | العربية | Français | 简体中文 | Español |
|---|---|---|---|---|
| Training (screen) | التدريب | Entraînement | 训练 | Entrenamiento |
| Exercise | تمرين | exercice | 动作 | ejercicio |
| Routine | روتين | routine | 例行训练 | rutina |
| Program | البرنامج | programme | 训练计划 | programa |
| Workout | حصة تدريب | séance | 训练 | entrenamiento |
| Set | مجموعة | série | 组 | serie |
| Rep | تكرار | répétition (rép.) | 次 | repetición (rep.) |
| Warm-up | إحماء | échauffement | 热身 | calentamiento |
| Rest (between sets / rest day) | راحة | repos | 休息 | descanso |
| Effort | الجهد | effort | 感受 | esfuerzo |
| Whenever I can (program mode) | متى استطعت | Quand je peux | 有空就练 | Cuando pueda |
| Personal record (PR) | رقم قياسي شخصي | record personnel | 个人纪录 | récord personal |

French *série* already means streak; in Training it means a set, and context keeps them apart.
