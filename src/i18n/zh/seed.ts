import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { health: '健康', mind: '心灵', learning: '学习', books: '读书', work: '工作', life: '生活' },
  habits: { water: '喝水', read: '阅读', meditate: '冥想', exercise: '运动', learn: '练习一项技能' },
  units: { min: '分钟', pages: '页', glasses: '杯', books: '本', modules: '单元' },
  goals: {
    books: { title: '今年读 12 本书', why: '每天一点点，积少成多。' },
    run: {
      title: '跑完 5 公里',
      why: '一步一步增强耐力。',
      milestones: ['每周快走三次，每次 30 分钟', '不停歇跑完 1 公里', '跑完 3 公里', '跑完 5 公里'],
    },
    skill: {
      title: '学会一项新技能',
      why: '每周都进步一点。',
      milestones: ['选定技能和一份好的学习资料', '练习满 10 小时', '用它做一个小作品', '分享或教别人你学到的东西'],
    },
    course: { title: '学完一门网课', why: '改成你正在学的那门课，或者删掉它。' },
  },
  tasks: {
    tour: '熟悉 Itqan：按 Ctrl+K（或点 + 按钮）添加任务',
    editGoals: '修改示例目标，让它们与你真实的目标一致，或者删掉它们',
    focus: '试一次 25 分钟的专注',
    walk: '散步 20 分钟',
  },
}
