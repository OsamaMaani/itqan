import type { Messages } from '../core'

export const daily: Messages['daily'] = {
  card: 'بطاقة اليوم',
  kinds: {
    verse: { label: 'آية', title: 'آية اليوم' },
    hadith: { label: 'حديث', title: 'حديث اليوم' },
    word: { label: 'كلمة', title: 'كلمة اليوم' },
    wisdom: { label: 'حكمة', title: 'حكمة' },
    fact: { label: 'معلومة', title: 'معلومة اليوم' },
  },
  fields: {
    Psychology: 'علم النفس', Medicine: 'الطب', Biology: 'الأحياء', Neuroscience: 'علم الأعصاب', Learning: 'التعلّم',
    Science: 'العلوم', Character: 'الأخلاق', History: 'التاريخ', Proverb: 'مثل',
  },
  wordQualifier: '{language} {level}',
  pos: {
    n: 'اسم', nm: 'اسم مذكر', nf: 'اسم مؤنث', nn: 'اسم محايد', v: 'فعل', adj: 'صفة', adv: 'ظرف',
    expr: 'تعبير', prep: 'حرف جر', conj: 'أداة ربط', pron: 'ضمير',
  },
  verseRef: 'سورة {surah} {s}:{ayahs}',
  verseRefPart: 'من سورة {surah} {s}:{ayahs}',
  meaningBy: 'ترجمة المعاني: {name}',
  collections: {
    bukhari: 'صحيح البخاري', muslim: 'صحيح مسلم', tirmidhi: 'جامع الترمذي', abudawud: 'سنن أبي داود',
    ibnmajah: 'سنن ابن ماجه', bayhaqi: 'البيهقي، شعب الإيمان',
  },
  hadithNumber: '{collection} {n}',
  grades: { sahih: 'صحيح', hasan: 'حسن', hasanSahih: 'حسن صحيح' },
  graded: '{where} · {grade} (الألباني)',
  narratedBy: 'عن {name}',
  saidBy: '— {name}',
  saidByIn: '— {name}، {source}',
  factSource: 'المصدر: {source}',
  say: 'نطق «{word}»',
  sayExample: 'نطق المثال',
}
