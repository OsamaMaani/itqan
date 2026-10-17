import type { Messages } from '../core'

export const ideas: Messages['ideas'] = {
  subtitleCount: '{open} 个待实现 · {done} 个已实现',
  subtitleEmpty: '先把每个想法记下来，之后再决定怎么处理。',
  capturePlaceholder: '我有个想法…（按 Enter 保存）',
  saveIdea: '保存想法',
  emptyTitle: '想法箱还是空的',
  emptyBody: '创业点子、想学的东西、礼物、旅行、项目——用一行字记在这里。之后再把好的想法变成任务或目标。',
  status: { new: '新想法', exploring: '探索中', doing: '进行中', done: '已实现', dropped: '已放弃' },
  hint: { new: '刚记下', exploring: '正在琢磨', doing: '有了切实的下一步', done: '已变成现实' },
  columnCount: '{label} · {n}',
  showDropped: '显示已放弃的想法 · {n}',
  hideDropped: '隐藏已放弃的想法 · {n}',
  age: {
    now: '刚刚',
    minutes: { other: '{n} 分钟前' },
    hours: { other: '{n} 小时前' },
    days: { other: '{n} 天前' },
    months: { other: '{n} 个月前' },
    years: { other: '{n} 年前' },
  },
  tasks: '任务',
  task: '转为任务',
  projectCreated: '已根据你的想法创建项目',
  moveTo: { exploring: '移到探索中', doing: '移到进行中', done: '移到已实现' },
  madeReal: '想法已实现 · +20 XP',
  goalCreated: '已根据你的想法创建目标',

  toTask: {
    title: '转为任务',
    task: '任务',
    taskHint: '写成下一步具体可做的动作',
    when: '日期',
    inbox: '收件箱',
    addTask: '添加任务',
    addedInbox: '任务已加入收件箱',
    addedToday: '任务已添加到今天',
    addedTomorrow: '任务已添加到明天',
  },

  editor: {
    title: '想法',
    deleted: '想法已删除',
    notesPlaceholder: '为什么有意思、第一步、待解决的问题…',
    stage: '阶段',
  },
}
