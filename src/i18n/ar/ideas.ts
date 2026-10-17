import type { Messages } from '../core'

export const ideas: Messages['ideas'] = {
  subtitleCount: 'مفتوحة: {open} · تحققت: {done}',
  subtitleEmpty: 'دوّن كل فكرة الآن، وقرّر ما تفعله بها لاحقًا.',
  capturePlaceholder: 'لدي فكرة…  (Enter للحفظ)',
  saveIdea: 'حفظ الفكرة',
  emptyTitle: 'صندوق أفكار فارغ',
  emptyBody: 'أفكار تجارية، أشياء تتعلمها، هدايا، رحلات، مشاريع — اكتبها هنا في سطر واحد. لاحقًا، حوّل الجيد منها إلى مهام أو أهداف.',
  status: { new: 'جديدة', exploring: 'قيد الاستكشاف', doing: 'قيد التنفيذ', done: 'تحققت', dropped: 'متروكة' },
  hint: { new: 'دُوّنت للتو', exploring: 'قيد التفكير', doing: 'لها خطوات فعلية تالية', done: 'أصبحت واقعًا' },
  columnCount: '{label} · {n}',
  showDropped: 'عرض الأفكار المتروكة · {n}',
  hideDropped: 'إخفاء الأفكار المتروكة · {n}',
  age: {
    now: 'منذ أقل من دقيقة',
    minutes: { zero: 'منذ أقل من دقيقة', one: 'منذ دقيقة', two: 'منذ دقيقتين', few: 'منذ {n} دقائق', many: 'منذ {n} دقيقة', other: 'منذ {n} دقيقة' },
    hours: { zero: 'منذ أقل من ساعة', one: 'منذ ساعة', two: 'منذ ساعتين', few: 'منذ {n} ساعات', many: 'منذ {n} ساعة', other: 'منذ {n} ساعة' },
    days: { zero: 'منذ اليوم', one: 'منذ يوم', two: 'منذ يومين', few: 'منذ {n} أيام', many: 'منذ {n} يومًا', other: 'منذ {n} يوم' },
    months: { zero: 'منذ أقل من شهر', one: 'منذ شهر', two: 'منذ شهرين', few: 'منذ {n} أشهر', many: 'منذ {n} شهرًا', other: 'منذ {n} شهر' },
    years: { zero: 'منذ أقل من سنة', one: 'منذ سنة', two: 'منذ سنتين', few: 'منذ {n} سنوات', many: 'منذ {n} سنة', other: 'منذ {n} سنة' },
  },
  tasks: 'المهام',
  task: 'مهمة',
  projectCreated: 'أُنشئ مشروع من فكرتك',
  moveTo: { exploring: 'نقل إلى الاستكشاف', doing: 'نقل إلى التنفيذ', done: 'نقل إلى المتحققة' },
  madeReal: 'أصبحت الفكرة واقعًا · +20 XP',
  goalCreated: 'أُنشئ هدف من فكرتك',

  toTask: {
    title: 'تحويل إلى مهمة',
    task: 'المهمة',
    taskHint: 'اجعلها الخطوة العملية التالية مباشرة',
    when: 'متى',
    inbox: 'الوارد',
    addTask: 'إضافة مهمة',
    addedInbox: 'أُضيفت المهمة إلى الوارد',
    addedToday: 'أُضيفت المهمة لليوم',
    addedTomorrow: 'أُضيفت المهمة للغد',
  },

  editor: {
    title: 'فكرة',
    deleted: 'تم حذف الفكرة',
    notesPlaceholder: 'لماذا هي مثيرة للاهتمام، الخطوات الأولى، أسئلة مفتوحة…',
    stage: 'الحالة',
  },
}
