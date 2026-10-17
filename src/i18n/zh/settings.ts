import type { Messages } from '../core'

export const settings: Messages['settings'] = {
  title: '设置',
  subtitle: '打造属于你的 Itqan。',

  profile: {
    title: '个人资料',
    language: '界面语言',
    languageHint: '开启同步后，语言设置会跟随你到其他设备。',
    name: '你的名字',
    namePlaceholder: '显示在问候语中',
    theme: '主题',
    themes: { system: '跟随系统', light: '浅色', dark: '深色' },
    weekStartsOn: '每周起始日',
    focusMinutes: '专注（分钟）',
    breakMinutes: '休息（分钟）',
    sounds: '声音',
    showHijri: '显示伊斯兰历日期',
  },

  daily: {
    title: '每日卡片',
    body: '每天在“今天”页各显示一条，所有设备上都一样。在手机上会折叠成一行，轻点即可展开。',
    verse: '古兰经经文',
    hadith: '圣训',
    word: '每日一词',
    wisdom: '智慧',
    fact: '小知识',
    meaning: '在阿拉伯原文下方显示释义',
    wordLanguage: '每日一词——语言',
    level: '水平',
    levelLine: '{level}——{name}',
    chineseHsk: '中文使用 HSK 分级：{level} ≈ {hsk}',
    levelNames: { A1: '入门', A2: '初级', B1: '中级', B2: '中高级', C1: '高级', C2: '精通' },
  },

  areas: {
    title: '人生领域',
    add: '添加领域',
    body: '领域用来归类你的任务、习惯、目标和专注时间——也是“统计”中平衡图的依据。',
    edit: '编辑领域',
    editTitle: '编辑领域',
    newTitle: '新领域',
    namePlaceholder: '例如：阿拉伯诗歌',
    colour: '颜色',
    colours: {
      emerald: '翡翠绿', teal: '青绿', sky: '天蓝', indigo: '靛蓝', violet: '紫罗兰',
      rose: '玫瑰红', amber: '琥珀', orange: '橙色', lime: '青柠', slate: '石板灰',
    },
    deleteConfirm: '删除“{name}”？其中的任务、习惯和目标会保留，只是不再属于任何领域。',
  },

  counts: {
    tasks: { other: '{n} 个任务' },
    habits: { other: '{n} 个习惯' },
    goals: { other: '{n} 个目标' },
  },

  data: {
    title: '你的数据',
    intro: '所有数据都私密地保存在这个浏览器中——无需账号，没有服务器。这也意味着{warning}，所以请不时下载一份备份。',
    warning: '清除浏览器数据会把它们一并删除',
    lastBackup: '上次备份：{date}。',
    noBackup: '你还没有备份过。',
    download: '下载备份',
    restore: '从备份恢复',
    deleteAll: '删除所有数据',
    backupDownloaded: '备份已下载',
    backupRestored: '备份已恢复',
    restoreConfirm: '用这份备份替换 Itqan 中的所有内容（{tasks}、{habits}、{goals}）？',
    deleteAllPrompt: '这将删除所有数据——如果开启了同步，你其他设备上的数据也会被删除。输入“{word}”以确认。',
    deleteWord: '删除',
    deleted: '所有数据已删除',
  },

  shortcuts: {
    title: '快捷键',
    commandBar: '命令栏：添加任务，快速跳转',
    newTask: '新任务',
    goTo: '前往{pages}',
    closeDialog: '关闭对话框',
    install: '将 Itqan 安装为应用：在 Chrome 或 Edge 中，点击地址栏里的安装图标。在手机上，使用“{addToHome}”。安装后即可离线使用。',
    addToHome: '添加到主屏幕',
  },
}
