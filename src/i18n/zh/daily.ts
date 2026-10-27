import type { Messages } from '../core'

export const daily: Messages['daily'] = {
  card: '每日卡片',
  settings: '每日卡片设置',
  kinds: {
    verse: { label: '经文', title: '每日经文' },
    hadith: { label: '圣训', title: '每日圣训' },
    word: { label: '词语', title: '每日一词' },
    wisdom: { label: '智慧', title: '智慧' },
    fact: { label: '小知识', title: '每日小知识' },
  },
  fields: {
    Psychology: '心理学', Medicine: '医学', Biology: '生物学', Neuroscience: '神经科学', Learning: '学习',
    Science: '科学', Character: '品格', History: '历史', Proverb: '谚语',
  },
  wordQualifier: '{language} {level}',
  pos: {
    n: '名词', nm: '阳性名词', nf: '阴性名词', nn: '中性名词', v: '动词', adj: '形容词', adv: '副词',
    expr: '短语', prep: '介词', conj: '连词', pron: '代词',
  },
  verseRef: '{surah}（{s}:{ayahs}）',
  verseRefPart: '摘自{surah}（{s}:{ayahs}）',
  meaningBy: '意义译解：{name}',
  collections: {
    bukhari: '《布哈里圣训实录》', muslim: '《穆斯林圣训实录》', tirmidhi: '《提尔密济圣训集》', abudawud: '《艾布·达乌德圣训集》',
    ibnmajah: '《伊本·马哲圣训集》', bayhaqi: '拜海吉《信仰的分支》',
  },
  hadithNumber: '{collection}第 {n} 段',
  grades: { sahih: '健全', hasan: '良好', hasanSahih: '良好健全' },
  graded: '{where} · {grade}（据艾勒巴尼）',
  narratedBy: '由{name}传述',
  saidBy: '——{name}',
  saidByIn: '——{name}，{source}',
  factSource: '来源：{source}',
  say: '朗读“{word}”',
  sayExample: '朗读例句',
}
