import type { Messages } from '../core'

export const quickAdd: Messages['quickAdd'] = {
  placeholder: '添加任务…  试试“{example}”',
  example: '明天读 20 页书 #读书 !2',
  areaToken: '领域',
  projectToken: '项目',
  hint: '#{area} · +{project} · !1–3 · {days} · {time} · {estimate}',
}
