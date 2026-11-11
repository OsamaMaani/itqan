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
    id: 11,
    date: '2026-11-11',
    tasks: ['S2-54'],
    items: [
      {
        emoji: '🔄',
        text: {
          en: 'New on Focus: cycles. Plan several sessions with breaks between them — 4 × 25 / 5, or your own — and change any step’s length or what it’s for. When a session or break ends you’re notified and asked: go on, add 5, 10 or 15 minutes, skip the break, or end. Paused in a break? Continue it or start the next session.',
          ar: 'جديد في التركيز: الدورات. خطّط لعدة جلسات بينها استراحات — 4 × 25 / 5 أو كما تريد — وغيّر مدة أي خطوة أو ما هي له. عند انتهاء جلسة أو استراحة يصلك إشعار ويُسأل: المتابعة، أو إضافة 5 أو 10 أو 15 دقيقة، أو تخطي الاستراحة، أو الإنهاء. وإذا أوقفت الاستراحة مؤقتًا فاختر بين إكمالها وبدء الجلسة التالية.',
          fr: 'Nouveau dans Concentration : les cycles. Planifie plusieurs sessions avec des pauses entre elles — 4 × 25 / 5, ou à ta façon — et change la durée ou l’objet de chaque étape. À la fin d’une session ou d’une pause, tu reçois une notification et Itqan te demande : continuer, ajouter 5, 10 ou 15 min, passer la pause ou arrêter. En pause pendant une pause ? Reprends-la ou lance la session suivante.',
          zh: '专注新功能：循环。安排几段专注，中间穿插休息——4 × 25 / 5，或按你的方式——还可以修改每一步的时长或内容。每段专注或休息结束时都会通知你并询问：继续、加 5、10 或 15 分钟、跳过休息，或结束。休息时暂停了？可以继续休息，或直接开始下一段专注。',
          es: 'Nuevo en Concentración: ciclos. Planifica varias sesiones con descansos entre ellas —4 × 25 / 5, o a tu manera— y cambia la duración o el objetivo de cada paso. Cuando termina una sesión o un descanso, recibes un aviso y Itqan te pregunta: seguir, añadir 5, 10 o 15 minutos, saltar el descanso o terminar. ¿Pausaste un descanso? Continúalo o empieza la siguiente sesión.',
        },
      },
      {
        emoji: '🕌',
        text: {
          en: 'Cycles know the prayer times: if a session would run into Asr, one tap stops it at the prayer and adds a prayer break. Save your favourite plans as templates; they follow you to the iPhone.',
          ar: 'الدورات تعرف أوقات الصلاة: إن كانت جلسة ستمتد إلى العصر مثلًا، فبنقرة واحدة تتوقف عند الصلاة وتُضاف استراحة للصلاة. واحفظ خططك المفضلة قوالبَ تنتقل معك إلى الآيفون.',
          fr: 'Les cycles connaissent les heures de prière : si une session déborde sur Asr, un seul geste l’arrête à la prière et ajoute une pause pour prier. Enregistre tes plans préférés comme modèles ; ils te suivent sur l’iPhone.',
          zh: '循环会考虑礼拜时间：如果某段专注会跨过晡礼，点一下就能在礼拜时停下并加入一段礼拜休息。把常用的安排保存为模板，iPhone 上也能用。',
          es: 'Los ciclos conocen los horarios de oración: si una sesión llega al Asr, con un toque se detiene en la oración y se añade un descanso para rezar. Guarda tus planes favoritos como plantillas; te acompañan al iPhone.',
        },
      },
      {
        emoji: '📞',
        text: {
          en: 'When you pause, tap what interrupted you — a call, someone, a distraction, prayer. Insights now shows your interruptions and focus cycles, and a finished cycle shows its summary. Two new badges.',
          ar: 'عند الإيقاف المؤقت، انقر على ما قاطعك — مكالمة، شخص، تشتت، صلاة. وصارت الإحصاءات تعرض المقاطعات ودورات التركيز، وتظهر خلاصة كل دورة عند انتهائها. وشارتان جديدتان.',
          fr: 'Quand tu fais une pause, touche ce qui t’a interrompu — un appel, quelqu’un, une distraction, la prière. Les statistiques montrent maintenant tes interruptions et tes cycles, et un cycle terminé affiche son bilan. Deux nouveaux badges.',
          zh: '暂停时，点一下是什么打断了你——电话、有人找、分心、礼拜。统计页现在会显示打断情况和专注循环，循环结束时还会显示总结。另有两枚新徽章。',
          es: 'Al pausar, toca qué te interrumpió: una llamada, alguien, una distracción, la oración. Estadísticas ahora muestra tus interrupciones y ciclos de enfoque, y un ciclo terminado muestra su resumen. Dos insignias nuevas.',
        },
      },
    ],
  },
  {
    id: 10,
    date: '2026-11-11',
    tasks: ['S3-06'],
    items: [
      {
        emoji: '📖',
        text: {
          en: 'Fixed: PDF pages on the iPhone no longer stay white. The reader now draws the page you’re on first, then the next ones, uses much less memory, and opens big scanned books quickly by reading only the pages you look at. You can also pinch to zoom.',
          ar: 'إصلاح: لم تعد صفحات PDF تظهر بيضاء على الآيفون. صار القارئ يرسم الصفحة التي أنت عليها أولًا ثم ما بعدها، ويستهلك ذاكرة أقل بكثير، ويفتح الكتب الممسوحة الكبيرة بسرعة لأنه لا يقرأ إلا الصفحات التي تنظر إليها. ويمكنك أيضًا التكبير بإصبعين.',
          fr: 'Corrigé : les pages PDF ne restent plus blanches sur l’iPhone. Le lecteur dessine d’abord la page où tu es, puis les suivantes, utilise beaucoup moins de mémoire, et ouvre vite les gros livres scannés en ne lisant que les pages que tu regardes. Tu peux aussi zoomer en pinçant l’écran.',
          zh: '已修复：iPhone 上的 PDF 页面不再一片空白。阅读器现在先绘制你正在看的页，再绘制后面的页，占用的内存少得多，而且只读取你正在看的页面，因此大型扫描书也能很快打开。还可以用双指缩放。',
          es: 'Corregido: las páginas PDF ya no se quedan en blanco en el iPhone. El lector dibuja primero la página en la que estás y luego las siguientes, usa mucha menos memoria y abre rápido los libros escaneados grandes porque solo lee las páginas que miras. También puedes pellizcar para hacer zoom.',
        },
      },
    ],
  },
  {
    id: 9,
    date: '2026-11-11',
    tasks: ['S3-05'],
    items: [
      {
        emoji: '🔗',
        text: {
          en: 'Books can now count toward what you are working on. In a book’s settings, link it to a habit (pages or minutes read), a task that completes when you reach a page, or a goal — a milestone ticked when you finish, or pages or an amount added to a number goal. Insights has a new Reading section: time, pages, days and books finished, with reading that has no link shown as general reading.',
          ar: 'صار بإمكان الكتب أن تُحسب لما تعمل عليه. من إعدادات الكتاب، اربطه بعادة (الصفحات أو دقائق القراءة)، أو بمهمة تكتمل عند بلوغ صفحة معيّنة، أو بهدف: مرحلة تُعلَّم عند إنهائه، أو صفحات أو كمية تُضاف إلى هدف رقمي. وفي الإحصاءات قسم جديد للقراءة: الوقت والصفحات والأيام والكتب المنتهية، وتظهر القراءة غير المرتبطة قراءةً عامة.',
          fr: 'Tes livres peuvent maintenant compter pour ce sur quoi tu travailles. Dans les réglages d’un livre, relie-le à une habitude (pages ou minutes lues), à une tâche terminée quand tu atteins une page, ou à un objectif : une étape cochée quand tu le finis, ou des pages ou une quantité ajoutées à un objectif chiffré. Les statistiques ont une nouvelle section Lecture : temps, pages, jours et livres terminés, la lecture sans lien comptant comme lecture libre.',
          zh: '书现在可以计入你正在做的事了。在书的设置里，可以把它关联到一个习惯（按已读页数或分钟）、一项读到某页就完成的任务，或一个目标：读完时勾选一个里程碑，或为数字目标增加页数或数量。统计中新增“阅读”部分：时间、页数、天数和读完的书，没有关联的阅读算作一般阅读。',
          es: 'Ahora los libros pueden contar para aquello en lo que trabajas. En los ajustes de un libro, vincúlalo a un hábito (páginas o minutos leídos), a una tarea que se completa al llegar a una página, o a un objetivo: un hito que se marca al terminarlo, o páginas o una cantidad que se suman a un objetivo numérico. Estadísticas tiene una nueva sección de Lectura: tiempo, páginas, días y libros terminados, y la lectura sin vínculo aparece como lectura general.',
        },
      },
    ],
  },
  {
    id: 8,
    date: '2026-11-11',
    tasks: ['S3-02'],
    items: [
      {
        emoji: '📚',
        text: {
          en: 'New: Library. Add a PDF and read it right here — it opens on the page where you stopped, on your laptop and your iPhone. Bookmark pages, switch to night mode, and see your reading time. Books you read on paper fit too: keep your page by hand. On the other device, choose the same PDF once; the files stay on each device, only your page syncs.',
          ar: 'جديد: المكتبة. أضف ملف PDF واقرأه هنا مباشرة، فيُفتح على الصفحة التي توقفت عندها، على حاسوبك وهاتفك. ضع علامات على الصفحات، وانتقل إلى الوضع الليلي، واطّلع على وقت قراءتك. وللكتب الورقية مكان أيضًا: احفظ صفحتك بنفسك. على الجهاز الآخر، اختر ملف PDF نفسه مرة واحدة؛ تبقى الملفات على كل جهاز، ولا يُزامَن إلا موضعك.',
          fr: 'Nouveau : la Bibliothèque. Ajoute un PDF et lis-le ici même : il s’ouvre à la page où tu t’es arrêté, sur ton ordinateur comme sur ton iPhone. Marque des pages, passe en mode nuit et vois ton temps de lecture. Les livres papier ont aussi leur place : note ta page toi-même. Sur l’autre appareil, choisis une fois le même PDF ; les fichiers restent sur chaque appareil, seule ta page est synchronisée.',
          zh: '新功能：书库。添加 PDF 就能直接在这里阅读，无论在电脑还是 iPhone 上，都会从你停下的那一页打开。可以加书签、切换夜间模式、查看阅读时间。纸质书也能放进来：自己记下页码。在另一台设备上选一次同一个 PDF 即可；文件留在各自的设备上，同步的只有你读到的位置。',
          es: 'Nuevo: Biblioteca. Añade un PDF y léelo aquí mismo: se abre en la página donde lo dejaste, en tu portátil y en tu iPhone. Marca páginas, cambia al modo noche y consulta tu tiempo de lectura. Los libros en papel también caben: apunta tu página a mano. En el otro dispositivo, elige una vez el mismo PDF; los archivos se quedan en cada dispositivo y solo se sincroniza tu página.',
        },
      },
    ],
  },
  {
    id: 7,
    date: '2026-10-31',
    tasks: ['S2-53'],
    items: [
      {
        emoji: '🕌',
        text: {
          en: 'Setting a habit’s time is simpler. Pick the days it counts for, then From and Until — “From Thursday at Maghrib until Friday at Maghrib” — or tap a quick pick like Friday. When it spans two days, choose which normal day it counts on; the Islamic day is marked. A picture of day and night shows it all and changes as you edit.',
          ar: 'صار تحديد وقت العادة أسهل. اختر الأيام التي تُحسب لها، ثم «من» و«إلى» — «من مغرب الخميس إلى مغرب الجمعة» — أو اضغط اختيارًا سريعًا مثل «الجمعة». وإن امتدت على يومين، فاختر اليوم العادي الذي تُحسب فيه، مع تمييز اليوم الشرعي. ويُظهر رسمٌ لليل والنهار ذلك كله، ويتغير مع كل تعديل.',
          fr: 'Choisir le moment d’une habitude est plus simple. Choisis les jours pour lesquels elle compte, puis De et Jusqu’à — « du jeudi au Maghreb jusqu’au vendredi au Maghreb » — ou touche un choix rapide comme Vendredi. Sur deux jours, choisis le jour ordinaire pour lequel elle compte ; le jour islamique est indiqué. Un dessin du jour et de la nuit montre tout cela et change à chaque modification.',
          zh: '设置习惯的时间更简单了。先选它计入的日子，再选“从”和“到”——“从周四昏礼到周五昏礼”——或点一下“主麻日”这样的快速选择。跨两天时，选择它计入哪个普通日，伊斯兰日会被标出。一幅白天与黑夜的图会显示这一切，并随每次修改而变化。',
          es: 'Fijar el momento de un hábito es más sencillo. Elige los días para los que cuenta y luego Desde y Hasta — «desde el jueves en Magrib hasta el viernes en Magrib» — o toca una opción rápida como Viernes. Si abarca dos días, elige el día normal para el que cuenta; el día islámico aparece marcado. Un dibujo del día y la noche lo muestra todo y cambia con cada ajuste.',
        },
      },
    ],
  },
  {
    id: 6,
    date: '2026-10-30',
    tasks: ['S2-52'],
    items: [
      {
        emoji: '💾',
        text: {
          en: 'While sync is working, Itqan no longer says your data lives only in this browser: a sync counts as a backup. If sync stops for two weeks, it reminds you again.',
          ar: 'ما دامت المزامنة تعمل، لم يعد إتقان يقول إن بياناتك موجودة في هذا المتصفح فقط: فالمزامنة تُعدّ نسخة احتياطية. وإن توقفت المزامنة أسبوعين، يذكّرك من جديد.',
          fr: 'Tant que la synchronisation fonctionne, Itqan ne dit plus que tes données ne sont que dans ce navigateur : une synchronisation compte comme une sauvegarde. Si elle s’arrête deux semaines, il te le rappelle.',
          zh: '只要同步正常，Itqan 不会再说你的数据只在这个浏览器里：一次同步就算一次备份。如果同步停了两周，它会再次提醒你。',
          es: 'Mientras la sincronización funcione, Itqan ya no dice que tus datos solo están en este navegador: una sincronización cuenta como copia de seguridad. Si se detiene dos semanas, te lo vuelve a recordar.',
        },
      },
    ],
  },
  {
    id: 5,
    date: '2026-10-30',
    tasks: ['S2-51'],
    items: [
      {
        emoji: '🕌',
        text: {
          en: 'A habit can now have its own time: between two prayers or clock times — Friday between Asr and Maghrib, or from Thursday’s Asr to Friday’s Maghrib, counted on the day you choose. Turn on “Only at certain times” when you create or edit a habit.',
          ar: 'صار للعادة وقتها الخاص: بين صلاتين أو ساعتين — يوم الجمعة بين العصر والمغرب، أو من عصر الخميس إلى مغرب الجمعة، وتُحسب لليوم الذي تختاره. فعّل «في أوقات محددة فقط» عند إنشاء العادة أو تعديلها.',
          fr: 'Une habitude peut maintenant avoir son moment : entre deux prières ou deux heures — le vendredi entre Asr et Maghreb, ou de l’Asr du jeudi au Maghreb du vendredi, comptée le jour que tu choisis. Active « Seulement à certains moments » en créant ou en modifiant une habitude.',
          zh: '习惯现在可以有自己的时间：在两次礼拜或两个钟点之间——周五晡礼到昏礼之间，或从周四晡礼到周五昏礼，并计入你选择的那一天。创建或编辑习惯时打开“仅在特定时间”。',
          es: 'Ahora un hábito puede tener su propio momento: entre dos rezos o dos horas — el viernes entre Asr y Magrib, o del Asr del jueves al Magrib del viernes, contado el día que elijas. Activa «Solo en ciertos momentos» al crear o editar un hábito.',
        },
      },
      {
        emoji: '⏳',
        text: {
          en: 'On Today, a timed habit counts down: how long until it opens, and how much time is left. Choose how early it appears and switch either countdown off in Settings → Day and prayers, which also shows today’s prayer times.',
          ar: 'في صفحة اليوم، تعدّ العادة المؤقتة تنازليًا: كم بقي حتى تبدأ، وكم بقي من وقتها. اختر متى تظهر وأوقف أيًّا من العدّين من الإعدادات ← اليوم والصلوات، وفيها أيضًا مواقيت الصلاة لليوم.',
          fr: 'Sur Aujourd’hui, une habitude à horaire fait un compte à rebours : dans combien de temps elle commence, et le temps qu’il lui reste. Choisis quand elle apparaît et coupe l’un ou l’autre dans Réglages → Jour et prières, qui montre aussi les heures de prière du jour.',
          zh: '在“今天”页，定时习惯会倒计时：还有多久开始，还剩多少时间。在“设置 → 日期与礼拜”中选择它何时出现、关闭任一倒计时，那里也显示今天的礼拜时间。',
          es: 'En Hoy, un hábito con horario hace cuenta atrás: cuánto falta para que empiece y cuánto tiempo le queda. Elige cuándo aparece y apaga cualquiera de las dos en Ajustes → Día y rezos, que también muestra las horas de rezo de hoy.',
        },
      },
    ],
  },
  {
    id: 4,
    date: '2026-10-28',
    tasks: ['S2-50'],
    items: [
      {
        emoji: '🗂️',
        text: {
          en: 'Settings is now in sections — General, Notifications, Daily card, Sync and more. On a laptop pick one from the menu beside it; on a phone tap one in the list. No more scrolling through everything.',
          ar: 'صارت الإعدادات أقسامًا — عام، الإشعارات، بطاقة اليوم، المزامنة وغيرها. على الحاسوب اختر قسمًا من القائمة بجانبها، وعلى الهاتف اضغط قسمًا من القائمة. لا حاجة بعد الآن للتمرير عبر كل شيء.',
          fr: 'Les Réglages sont maintenant en sections — Général, Notifications, Carte du jour, Synchronisation et d’autres. Sur ordinateur, choisis-en une dans le menu à côté ; sur téléphone, touche-la dans la liste. Plus besoin de tout faire défiler.',
          zh: '设置现在分成了几个部分——通用、通知、每日卡片、同步等。在电脑上从旁边的菜单中选择，在手机上点列表中的一项。不用再从头滚到尾了。',
          es: 'Los Ajustes ahora están en secciones: General, Notificaciones, Tarjeta del día, Sincronización y más. En el portátil, elige una en el menú de al lado; en el móvil, toca una en la lista. Ya no hace falta recorrerlo todo.',
        },
      },
    ],
  },
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
