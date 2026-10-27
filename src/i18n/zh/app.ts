import type { Messages } from '../core'

export const app: Messages['app'] = {
  levelUp: '升至 {n} 级——{title}！',
  backupDue: '距上次备份已有两周',
  backupNever: '你的数据只保存在这个浏览器里',
  backUp: '备份',
  whatsNew: {
    title: 'Itqan 新功能',
    history: '全部更新',
    gotIt: '知道了',
    settingsTitle: '新功能',
    settingsBody: 'Itqan 的每一次更新，最新的在前。',
    seeAll: '查看全部更新',
  },
}
