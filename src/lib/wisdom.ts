/** One line a day on the Today screen. Classical sources, paraphrased. */
export const WISDOM: { text: string; source: string }[] = [
  { text: 'The deeds most loved by Allah are those done consistently, even if they are small.', source: 'Hadith — Bukhari & Muslim' },
  { text: 'Allah loves that when one of you does a deed, he does it with itqan — with excellence.', source: 'Hadith — al-Bayhaqi' },
  { text: 'Take advantage of five before five: your youth, your health, your wealth, your free time and your life.', source: 'Hadith — al-Hakim' },
  { text: 'Indeed, with hardship comes ease.', source: 'Quran 94:6' },
  { text: 'Allah does not burden a soul beyond what it can bear.', source: 'Quran 2:286' },
  { text: 'And say: My Lord, increase me in knowledge.', source: 'Quran 20:114' },
  { text: 'Whoever treads a path seeking knowledge, Allah makes easy for him a path to Paradise.', source: 'Hadith — Muslim' },
  { text: 'The strong believer is better and more beloved to Allah than the weak believer, and in both there is good.', source: 'Hadith — Muslim' },
  { text: 'Tie your camel, then put your trust in Allah.', source: 'Hadith — Tirmidhi' },
  { text: 'Time is like a sword: if you do not cut it, it cuts you.', source: 'Arabic proverb' },
  { text: 'Drop by drop, a river is made.', source: 'Proverb' },
  { text: 'Whoever persists in knocking on a door will have it opened.', source: 'Arabic proverb' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', source: 'After Aristotle' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', source: 'Proverb' },
  { text: 'A journey of a thousand miles begins with a single step.', source: 'Laozi' },
  { text: 'Little by little, one travels far.', source: 'Spanish proverb' },
  { text: 'Petit à petit, l’oiseau fait son nid. — Little by little, the bird builds its nest.', source: 'French proverb' },
  { text: 'Knowledge is not what is memorised; knowledge is what benefits.', source: 'Imam al-Shafi‘i' },
  { text: 'Do not let your yesterday take up too much of your today.', source: 'Proverb' },
  { text: 'Whoever has two days that are equal has been cheated.', source: 'Classical saying' },
  { text: 'Plans are nothing; planning is everything.', source: 'Dwight D. Eisenhower' },
]

export function wisdomFor(day: string) {
  let h = 0
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return WISDOM[h % WISDOM.length]
}
