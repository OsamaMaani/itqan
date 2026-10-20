import type { Messages } from '../core'

export const settings: Messages['settings'] = {
  title: 'الإعدادات',
  subtitle: 'اجعل إتقان على مقاسك.',

  profile: {
    title: 'الملف الشخصي',
    language: 'لغة الواجهة',
    languageHint: 'عند تفعيل المزامنة، تنتقل لغتك معك إلى أجهزتك الأخرى.',
    name: 'اسمك',
    namePlaceholder: 'يظهر في التحية',
    theme: 'المظهر',
    themes: { system: 'حسب النظام', light: 'فاتح', dark: 'داكن' },
    weekStartsOn: 'يبدأ الأسبوع يوم',
    weightUnit: 'وحدة الأوزان',
    weightUnitHint: 'التغيير لا يمسّ ما سجّلته',
    focusMinutes: 'التركيز (دقيقة)',
    breakMinutes: 'الاستراحة (دقيقة)',
    sounds: 'الأصوات',
    showHijri: 'إظهار التاريخ الهجري',
  },

  daily: {
    title: 'بطاقة اليوم',
    body: 'يظهر واحد من كل نوع كل يوم في صفحة اليوم، وهو نفسه على كل أجهزتك. وعلى الهاتف تبقى البطاقة مطوية في سطر واحد حتى تفتحها.',
    verse: 'آية من القرآن',
    hadith: 'حديث',
    word: 'كلمة اليوم',
    wisdom: 'حكمة',
    fact: 'معلومة',
    meaning: 'إظهار المعنى تحت النص العربي',
    wordLanguage: 'كلمة اليوم — اللغة',
    level: 'المستوى',
    levelLine: '{level} — {name}',
    chineseHsk: 'الصينية تعتمد HSK: {level} ≈ {hsk}',
    levelNames: { A1: 'مبتدئ', A2: 'أساسي', B1: 'متوسط', B2: 'فوق المتوسط', C1: 'متقدّم', C2: 'متمكّن' },
  },

  areas: {
    title: 'مجالات الحياة',
    add: 'إضافة مجال',
    body: 'تجمع المجالات مهامك وعاداتك وأهدافك ووقت تركيزك — وعليها يقوم مخطط التوازن في الإحصاءات.',
    edit: 'تعديل المجال',
    editTitle: 'تعديل المجال',
    newTitle: 'مجال جديد',
    namePlaceholder: 'مثلًا: الشعر العربي',
    colour: 'اللون',
    colours: {
      emerald: 'زمردي', teal: 'فيروزي', sky: 'سماوي', indigo: 'نيلي', violet: 'بنفسجي',
      rose: 'وردي', amber: 'كهرماني', orange: 'برتقالي', lime: 'ليموني', slate: 'رمادي',
    },
    deleteConfirm: 'حذف «{name}»؟ تبقى مهامه وعاداته وأهدافه، لكن بلا مجال.',
  },

  counts: {
    tasks: { zero: 'لا مهام', one: 'مهمة واحدة', two: 'مهمتان', few: '{n} مهام', many: '{n} مهمة', other: '{n} مهمة' },
    habits: { zero: 'لا عادات', one: 'عادة واحدة', two: 'عادتان', few: '{n} عادات', many: '{n} عادة', other: '{n} عادة' },
    goals: { zero: 'لا أهداف', one: 'هدف واحد', two: 'هدفان', few: '{n} أهداف', many: '{n} هدفًا', other: '{n} هدف' },
  },

  data: {
    title: 'بياناتك',
    intro: 'كل شيء محفوظ بخصوصية في هذا المتصفح — بلا حساب ولا خادم. وهذا يعني أيضًا أن {warning}، لذا نزّل نسخة احتياطية بين حين وآخر.',
    warning: 'مسح بيانات المتصفح يحذفها',
    lastBackup: 'آخر نسخة احتياطية: {date}.',
    noBackup: 'لم تُنشئ أي نسخة احتياطية بعد.',
    download: 'تنزيل نسخة احتياطية',
    restore: 'الاستعادة من نسخة احتياطية',
    deleteAll: 'حذف كل شيء',
    backupDownloaded: 'تم تنزيل النسخة الاحتياطية',
    backupRestored: 'تمت استعادة النسخة الاحتياطية',
    restoreConfirm: 'استبدال كل ما في إتقان بهذه النسخة الاحتياطية ({tasks}، {habits}، {goals})؟',
    deleteAllPrompt: 'سيحذف هذا كل شيء — وعلى أجهزتك الأخرى أيضًا إن كانت المزامنة مفعّلة. اكتب كلمة «{word}» للتأكيد.',
    deleteWord: 'حذف',
    deleted: 'تم حذف كل البيانات',
  },

  shortcuts: {
    title: 'الاختصارات',
    commandBar: 'شريط الأوامر: إضافة المهام والانتقال إلى أي مكان',
    newTask: 'مهمة جديدة',
    goTo: 'الانتقال إلى {pages}',
    closeDialog: 'إغلاق النافذة',
    install: 'ثبّت إتقان كتطبيق: في Chrome أو Edge، استخدم أيقونة التثبيت في شريط العنوان. وعلى الهاتف، استخدم {addToHome}. بعدها يعمل دون اتصال.',
    addToHome: 'إضافة إلى الشاشة الرئيسية',
  },
}
