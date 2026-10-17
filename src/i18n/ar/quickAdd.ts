import type { Messages } from '../core'

export const quickAdd: Messages['quickAdd'] = {
  placeholder: 'أضف مهمة…  جرّب «{example}»',
  example: 'اقرأ 20 صفحة #الكتب غدًا !2',
  areaToken: 'مجال',
  projectToken: 'مشروع',
  hint: '#{area} · +{project} · !1–3 · {days} · {time} · {estimate}',
}
