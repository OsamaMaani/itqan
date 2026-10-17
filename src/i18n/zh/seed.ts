import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { quran: '古兰经', french: '法语', gym: '健身', books: '读书', courses: '课程', life: '生活' },
  habits: { quran: '复习古兰经', french: '练习法语', read: '阅读', gym: '健身', course: '学习课程' },
  units: { min: '分钟', pages: '页', juz: '卷', modules: '单元' },
  goals: {
    quran: { title: '完整复习一遍古兰经', why: '让背过的经文牢固扎实，常在心间。' },
    french: {
      title: '法语达到 B1',
      why: '能自信地开口说，而不只是通过考试。',
      milestones: ['完成 A2 语法复习', '掌握 1000 个核心词汇', '做 5 次口头报告', '通过一次 B1 模拟考试'],
    },
    book: { title: '读完手头这本书', why: '把书名和页数改成你正在读的那本书。' },
    course: { title: '学完手头这门课', why: '改成你正在学的那门课。' },
  },
  tasks: {
    tour: '熟悉 Itqan：按 Ctrl+K（或点 + 按钮）添加任务',
    editGoals: '修改示例目标，让它们与你真实的书、课程和目标一致',
    focus: '试一次 25 分钟的专注',
    gym: '健身训练',
  },
}
