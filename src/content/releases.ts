import type { Lang } from '../i18n/core'
import type { DateKey } from '../lib/types'

/**
 * What's new (ADR-040): one entry per shipped update, newest first. Every task marked done in
 * memory/status.json from S2-43 on must be listed in some entry's `tasks` (releases.test.ts fails
 * otherwise), so no update ships unannounced. An update with nothing the owner would notice lists
 * its tasks with no `items` and is never shown.
 *
 * Written for the person using Itqan, not for developers: what they can now do, and where. Every
 * item in all five interface languages.
 */

export interface ReleaseItem {
  emoji: string
  text: Record<Lang, string>
}

export interface Release {
  /** Increases by one with each entry. */
  id: number
  date: DateKey
  tasks: string[]
  items: ReleaseItem[]
}

export const RELEASES: Release[] = [
  {
    id: 3,
    date: '2026-10-28',
    tasks: ['S2-49'],
    items: [
      {
        emoji: '🌙',
        text: {
          en: 'Your day can now end at Fajr instead of midnight: up late, what you finish before Fajr still counts for that day. Turn it on in Settings → When a day starts. Nothing you already did moves.',
          ar: 'يمكن الآن أن ينتهي يومك عند الفجر بدل منتصف الليل: إن سهرت، يُحسب ما تنجزه قبل الفجر لذلك اليوم. فعّله من الإعدادات ← متى يبدأ اليوم. لا يتحرك شيء مما أنجزته سابقًا.',
          fr: 'Ta journée peut maintenant se terminer au Fajr plutôt qu’à minuit : si tu veilles, ce que tu termines avant le Fajr compte encore pour ce jour-là. À activer dans Réglages → Quand commence une journée. Rien de ce que tu as déjà fait ne bouge.',
          zh: '现在你的一天可以在晨礼时结束，而不是午夜：熬夜时，晨礼前完成的事仍算作当天。在“设置 → 一天何时开始”中开启。已完成的事不会移动。',
          es: 'Ahora tu día puede terminar en el Fajr en lugar de a medianoche: si trasnochas, lo que termines antes del Fajr sigue contando para ese día. Actívalo en Ajustes → Cuándo empieza el día. Nada de lo que ya hiciste se mueve.',
        },
      },
      {
        emoji: '📅',
        text: {
          en: 'With it on, completing a task or habit tells you which day it counted for.',
          ar: 'عند تفعيله، يخبرك إتمام مهمة أو عادة لأي يوم حُسبت.',
          fr: 'Une fois activé, chaque tâche ou habitude accomplie te dit pour quel jour elle a compté.',
          zh: '开启后，完成任务或习惯时会告诉你它计入了哪一天。',
          es: 'Con esto activado, al completar una tarea o un hábito se te indica para qué día contó.',
        },
      },
    ],
  },
  {
    id: 2,
    date: '2026-10-28',
    tasks: ['S2-46', 'S2-47', 'S2-48'],
    items: [
      {
        emoji: '🎯',
        text: {
          en: 'Goals: when you create one, a short guide shows how to set a good goal, and a checklist shows whether it is specific, measurable, has a deadline and a why. It is advice only — nothing is required.',
          ar: 'الأهداف: عند إنشاء هدف يظهر دليل قصير لكيفية وضع هدف جيد، وقائمة تبيّن هل هو محدد وقابل للقياس وله موعد وسبب. مجرد نصيحة — لا شيء إلزامي.',
          fr: 'Objectifs : en créant un objectif, un petit guide montre comment bien le fixer, et une liste indique s’il est précis, mesurable, avec une échéance et un pourquoi. Ce ne sont que des conseils — rien n’est obligatoire.',
          zh: '目标：创建目标时，会出现一份简短指南，教你如何定一个好目标；还有一个清单显示它是否具体、可衡量、有期限、有原因。只是建议——没有任何强制。',
          es: 'Metas: al crear una, una breve guía muestra cómo plantear una buena meta, y una lista indica si es concreta, medible, con fecha límite y con un porqué. Solo son consejos; nada es obligatorio.',
        },
      },
      {
        emoji: '📌',
        text: {
          en: 'Notes: the pin, “On Today” and archive switches now look clearly on (filled, green) or off.',
          ar: 'الملاحظات: أزرار التثبيت و«في اليوم» والأرشفة صار واضحًا الآن هل هي مفعّلة (ممتلئة وخضراء) أم لا.',
          fr: 'Notes : les boutons épingler, « Sur Aujourd’hui » et archiver montrent maintenant clairement s’ils sont activés (pleins, en vert) ou non.',
          zh: '笔记：置顶、“显示在今天”和归档按钮现在能清楚看出是开（实心、绿色）还是关。',
          es: 'Notas: los botones de fijar, «En Hoy» y archivar ahora muestran claramente si están activados (rellenos, en verde) o no.',
        },
      },
      {
        emoji: '📣',
        text: {
          en: 'What’s new: Itqan now tells you here whenever something new arrives. Past updates are in Settings.',
          ar: 'ما الجديد: صار إتقان يخبرك هنا كلما وصل شيء جديد. التحديثات السابقة في الإعدادات.',
          fr: 'Nouveautés : Itqan vous prévient désormais ici dès qu’il y a du nouveau. Les mises à jour passées sont dans les Réglages.',
          zh: '新功能：今后有新内容时，Itqan 会在这里告诉你。以往的更新在“设置”里。',
          es: 'Novedades: Itqan ahora te avisa aquí cada vez que llega algo nuevo. Las actualizaciones anteriores están en Ajustes.',
        },
      },
    ],
  },
  {
    id: 1,
    date: '2026-10-27',
    tasks: ['S2-43', 'S2-44', 'S2-45'],
    items: [
      {
        emoji: '📊',
        text: {
          en: 'Insights → Amounts: the pages, minutes or reps of every counted habit, compared with the previous period, with the daily average and the total.',
          ar: 'الإحصاءات ← المقادير: صفحات كل عادة معدودة أو دقائقها أو تكراراتها، مقارنةً بالفترة السابقة، مع المعدل اليومي والمجموع.',
          fr: 'Statistiques → Quantités : les pages, minutes ou répétitions de chaque habitude comptée, comparées à la période précédente, avec la moyenne par jour et le total.',
          zh: '统计 → 累计量：每个计数习惯的页数、分钟或次数，与上一时段对比，并显示日均和总量。',
          es: 'Estadísticas → Cantidades: las páginas, minutos o repeticiones de cada hábito contado, comparadas con el periodo anterior, con la media diaria y el total.',
        },
      },
      {
        emoji: '📖',
        text: {
          en: 'A full round for counted habits — say 604 pages of the Quran. Edit the habit, enter the size and where you are, and see “Round 1 · 250/604” and roughly when you will finish.',
          ar: 'ختمة كاملة للعادات المعدودة — مثل 604 صفحات للمصحف. عدّل العادة وأدخل المقدار وأين وصلت، فترى «الختمة 1 · 250/604» وموعد الانتهاء التقريبي.',
          fr: 'Un tour complet pour les habitudes comptées — par exemple 604 pages du Coran. Modifiez l’habitude, indiquez la taille et où vous en êtes, et voyez « Tour 1 · 250/604 » et quand vous devriez finir.',
          zh: '计数习惯可以设定完整一轮——比如古兰经 604 页。编辑习惯，填入总量和当前进度，就能看到“第 1 轮 · 250/604”以及大约何时完成。',
          es: 'Una vuelta completa para los hábitos contados, por ejemplo 604 páginas del Corán. Edita el hábito, indica el total y por dónde vas, y verás «Vuelta 1 · 250/604» y cuándo terminarás aproximadamente.',
        },
      },
      {
        emoji: '⚙️',
        text: {
          en: 'Daily card: the gear in its corner opens its own settings.',
          ar: 'بطاقة اليوم: الترس في زاويتها يفتح إعداداتها مباشرة.',
          fr: 'Carte du jour : l’engrenage dans son coin ouvre ses propres réglages.',
          zh: '每日卡片：角落的齿轮会直接打开它的设置。',
          es: 'Tarjeta del día: el engranaje de su esquina abre sus propios ajustes.',
        },
      },
      {
        emoji: '🔔',
        text: {
          en: 'Settings → Notifications now says clearly when this device can’t send alerts to your other devices.',
          ar: 'الإعدادات ← الإشعارات تخبرك الآن بوضوح حين لا يستطيع هذا الجهاز إرسال التنبيهات إلى أجهزتك الأخرى.',
          fr: 'Réglages → Notifications indique maintenant clairement quand cet appareil ne peut pas envoyer d’alertes à vos autres appareils.',
          zh: '设置 → 通知现在会清楚说明这台设备何时无法向你的其他设备发送提醒。',
          es: 'Ajustes → Notificaciones ahora indica claramente cuándo este dispositivo no puede enviar alertas a tus otros dispositivos.',
        },
      },
    ],
  },
]
