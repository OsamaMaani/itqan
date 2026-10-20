import type { Messages } from '../core'

export const levels: Messages['levels'] = [
  '新手', '学徒', '稳健', '坚定', '自律', '专注',
  '恒心', '坚韧', '行家', '大师', '至臻',
]

export const badges: Messages['badges'] = {
  'first-step': { title: '第一步', desc: '完成第一个任务' },
  'tasks-50': { title: '行动派', desc: '完成 50 个任务' },
  'tasks-250': { title: '建设者', desc: '完成 250 个任务' },
  'streak-7': { title: '坚持一周', desc: '一个习惯连续坚持 7 天' },
  'streak-30': { title: '整整一个月', desc: '一个习惯连续坚持 30 天' },
  'streak-100': { title: '坚不可摧', desc: '一个习惯连续坚持 100 天' },
  'active-14': { title: '势头正劲', desc: '连续 14 天保持活跃' },
  'focus-10h': { title: '深度工作者', desc: '累计专注 10 小时' },
  'focus-100h': { title: '学者', desc: '累计专注 100 小时' },
  'focus-90': { title: '心流', desc: '完成一次 90 分钟的专注' },
  'goal-1': { title: '目标达人', desc: '完成一个目标' },
  'goal-5': { title: '成就者', desc: '完成 5 个目标' },
  'review-4': { title: '善于反思', desc: '写下 4 次每周回顾' },
  early: { title: '早起的鸟儿', desc: '早上 7 点前完成一个任务' },
  owl: { title: '夜猫子', desc: '晚上 10 点后开始一次专注' },
  'level-5': { title: '崭露头角', desc: '达到 5 级' },
  'level-10': { title: '精益求精（Itqan）', desc: '达到 10 级' },
  'days-30': { title: '常伴左右', desc: '累计 30 天使用 Itqan' },
  'memories-10': { title: '讲故事的人', desc: '保存 10 段回忆' },
  'ideas-25': { title: '点子王', desc: '记下 25 个想法' },
  'idea-done': { title: '从想法到现实', desc: '把一个想法付诸实现' },
  'project-done': { title: '大功告成', desc: '完成一个项目' },
  'proud-10': { title: '引以为豪', desc: '记录 10 项成就' },
  'people-10': { title: '好朋友', desc: '记录 10 次与人的联系' },
  'people-50': { title: '广结善缘', desc: '记录 50 次与人的联系' },
  'workout-1': { title: '迈出第一步', desc: '完成第一次训练' },
  'workouts-10': { title: '健身常客', desc: '完成 10 次训练' },
  'workouts-50': { title: '钢铁意志', desc: '完成 50 次训练' },
  'record-1': { title: '更强了', desc: '创造一项个人纪录' },
  'weeks-4': { title: '扎实四周', desc: '连续 4 周完成训练计划' },
}
