/**
 * The daily card's content in this interface language (ADR-024), keyed by the English in
 * src/content/{hadith,sayings,facts}.ts. Written by hand by a translator, then reviewed against
 * memory/10-localization.md. daily.test.ts fails when an English item has no translation here.
 *
 * Arabic: narrators appear after «عن» (daily.narratedBy), so their names are in the genitive
 * (أبي هريرة). The hadith stands alone, without a meaning. Sayings that have their Arabic
 * original (`ar`) are shown in it and need nothing here; sayings first written in Arabic
 * (Ibn Hazm, Ibn Khaldun, al-Ghazali, Ibn al-Haytham, Ibn al-Qayyim, al-Hasan al-Basri, Ibn al-Jawzi)
 * are given in their original wording, and Hippocrates' first aphorism in Hunayn ibn Ishaq's classical
 * rendering. Published titles are used where an Arabic edition is established; otherwise the original.
 */
import type { DailyTranslation } from '../../lib/daily'

export const TEXT: DailyTranslation = {
  people: {
    "Umar ibn al-Khattab":
      "عمر بن الخطاب",
    "Aisha":
      "عائشة",
    "Abu Hurairah":
      "أبي هريرة",
    "Anas ibn Malik":
      "أنس بن مالك",
    "Ibn Abbas":
      "ابن عباس",
    "Uthman ibn Affan":
      "عثمان بن عفان",
    "Abdullah ibn Umar":
      "عبد الله بن عمر",
    "Jabir ibn Abdullah":
      "جابر بن عبد الله",
    "Usamah ibn Zayd":
      "أسامة بن زيد",
    "Abdullah ibn Amr":
      "عبد الله بن عمرو",
    "Jarir ibn Abdullah":
      "جرير بن عبد الله",
    "An-Nu‘man ibn Bashir":
      "النعمان بن بشير",
    "Imran ibn Husain":
      "عمران بن حصين",
    "Abu Musa al-Ash‘ari":
      "أبي موسى الأشعري",
    "Abdullah ibn Mas‘ud":
      "عبد الله بن مسعود",
    "Abu Sa‘id al-Khudri":
      "أبي سعيد الخدري",
    "Abu Sa‘id al-Khudri and Abu Hurairah":
      "أبي سعيد الخدري وأبي هريرة",
    "Mu‘awiyah":
      "معاوية",
    "Umar ibn Abi Salamah":
      "عمر بن أبي سلمة",
    "Abu Qatadah":
      "أبي قتادة",
    "Al-Miqdam":
      "المقدام",
    "Suhaib":
      "صهيب",
    "Shaddad ibn Aws":
      "شداد بن أوس",
    "Abu Dharr":
      "أبي ذر",
    "Abu Malik al-Ash‘ari":
      "أبي مالك الأشعري",
    "An-Nawwas ibn Sam‘an":
      "النواس بن سمعان",
    "Abu Umamah":
      "أبي أمامة",
    "Abu Mas‘ud al-Ansari":
      "أبي مسعود الأنصاري",
    "Zayd ibn Arqam":
      "زيد بن أرقم",
    "Tamim ad-Dari":
      "تميم الداري",
    "Abu ad-Darda":
      "أبي الدرداء",
    "Al-Miqdam ibn Ma‘dikarib":
      "المقدام بن معديكرب",
    "Ubaydullah ibn Mihsan":
      "عبيد الله بن محصن",
    "Abu Barzah al-Aslami":
      "أبي برزة الأسلمي",
    "Al-Hasan ibn Ali":
      "الحسن بن علي",
    "Abu Umamah al-Bahili":
      "أبي أمامة الباهلي",
    "Abdullah ibn Abbas":
      "عبد الله بن عباس",
    "Sakhr al-Ghamidi":
      "صخر الغامدي",
    "Umm Salamah":
      "أم سلمة",
    "Mu‘adh ibn Jabal":
      "معاذ بن جبل",
    "William James":
      "ويليام جيمس",
    "Viktor Frankl":
      "فيكتور فرانكل",
    "Friedrich Nietzsche, as quoted by Viktor Frankl":
      "فريدريش نيتشه، كما نقله فيكتور فرانكل",
    "Daniel Kahneman":
      "دانيال كانمان",
    "Carl Rogers":
      "كارل روجرز",
    "Mihaly Csikszentmihalyi":
      "ميهاي تشيكسنتميهاي",
    "Abraham Maslow":
      "أبراهام ماسلو",
    "Angela Duckworth":
      "أنجيلا داكوورث",
    "James Clear":
      "جيمس كلير",
    "Robert Waldinger":
      "روبرت والدينغر",
    "Epictetus":
      "إبكتيتوس",
    "Seneca":
      "سينيكا",
    "C. Northcote Parkinson":
      "سيريل نورثكوت باركنسون",
    "Douglas Hofstadter":
      "دوغلاس هوفستادتر",
    "Ibn Hazm":
      "ابن حزم",
    "Ibn Khaldun":
      "ابن خلدون",
    "Imam al-Shafi‘i":
      "الإمام الشافعي",
    "Abu Hamid al-Ghazali":
      "أبو حامد الغزالي",
    "attributed to Imam Ahmad ibn Hanbal":
      "يُنسب إلى الإمام أحمد بن حنبل",
    "Confucius":
      "كونفوشيوس",
    "E. O. Wilson":
      "إدوارد أوزبورن ويلسون",
    "Aristotle":
      "أرسطو",
    "Will Durant, summarising Aristotle":
      "ويل ديورانت، في تلخيصه لأرسطو",
    "Kurt Lewin":
      "كورت لوين",
    "Santiago Ramón y Cajal":
      "سانتياغو رامون إي كاخال",
    "Carla Shatz, summarising Donald Hebb":
      "كارلا شاتز، في تلخيصها لفكرة دونالد هب",
    "Matthew Walker":
      "ماثيو ووكر",
    "Hippocrates":
      "أبقراط",
    "Hippocratic Precepts":
      "الوصايا الأبقراطية",
    "Paracelsus":
      "باراسيلسوس",
    "traditional medical aphorism, 16th century":
      "حكمة طبية متوارثة، القرن السادس عشر",
    "attributed to Abu Bakr al-Razi":
      "يُنسب إلى أبي بكر الرازي",
    "attributed to William Osler":
      "يُنسب إلى ويليام أوسلر",
    "Rudolf Virchow":
      "رودولف فيرخو",
    "Florence Nightingale":
      "فلورنس نايتنجيل",
    "Atul Gawande":
      "أتول غاواندي",
    "Juvenal":
      "جوفينال",
    "Claude Bernard":
      "كلود برنار",
    "attributed to Jacques Monod":
      "يُنسب إلى جاك مونو",
    "Rachel Carson":
      "راشيل كارسون",
    "Ibn al-Haytham":
      "ابن الهيثم",
    "Louis Pasteur":
      "لويس باستور",
    "Richard Feynman":
      "ريتشارد فاينمان",
    "Isaac Newton":
      "إسحاق نيوتن",
    "attributed to Marie Curie":
      "يُنسب إلى ماري كوري",
    "Ibn al-Qayyim":
      "ابن القيم",
    "al-Hasan al-Basri":
      "الحسن البصري",
    "Ibn al-Jawzi":
      "ابن الجوزي",
    "Marcus Aurelius":
      "ماركوس أوريليوس",
    "Dwight D. Eisenhower":
      "دوايت أيزنهاور",
    "Peter Drucker":
      "بيتر دراكر",
    "Benjamin Franklin":
      "بنجامين فرانكلين",
    "Laozi":
      "لاو تزو",
    "Jean de La Fontaine":
      "جان دو لا فونتين",
    "Arabic proverb":
      "مثل عربي",
    "Arabic proverb (not a hadith)":
      "مثل عربي (وليس حديثًا)",
    "French proverb":
      "مثل فرنسي",
    "Japanese proverb":
      "مثل ياباني",
    "Proverb":
      "مثل",
    "Spanish proverb":
      "مثل إسباني",
  },
  sources: {
    "The Principles of Psychology, 1890":
      "مبادئ علم النفس، 1890",
    "Man’s Search for Meaning, 1946":
      "الإنسان يبحث عن المعنى، 1946",
    "Twilight of the Idols, 1889":
      "أفول الأصنام، 1889",
    "Thinking, Fast and Slow, 2011":
      "التفكير السريع والبطيء، 2011",
    "On Becoming a Person, 1961":
      "On Becoming a Person، 1961",
    "Flow, 1990":
      "Flow، 1990",
    "The Psychology of Science, 1966":
      "The Psychology of Science، 1966",
    "Grit, 2016":
      "Grit، 2016",
    "Atomic Habits, 2018":
      "العادات الذرية، 2018",
    "TED talk on the Harvard Study of Adult Development, 2015":
      "محاضرة TED عن دراسة هارفارد لتطور البالغين، 2015",
    "Enchiridion, 5 — a starting point of cognitive therapy":
      "المختصر، 5 — من منطلقات العلاج المعرفي",
    "Letters to Lucilius, 13":
      "رسائل إلى لوسيليوس، 13",
    "The Economist, 1955":
      "مجلة الإيكونوميست، 1955",
    "Gödel, Escher, Bach, 1979":
      "Gödel, Escher, Bach، 1979",
    "al-Akhlaq wa al-Siyar, c. 1030":
      "الأخلاق والسير في مداواة النفوس، نحو 1030",
    "The Muqaddimah, 1377":
      "المقدمة، 1377",
    "reported in Hilyat al-Awliya":
      "أورده أبو نعيم في حلية الأولياء",
    "Ayyuha al-Walad":
      "أيها الولد",
    "Analects 2.15":
      "المحاورات، 2.15",
    "Analects 1.1":
      "المحاورات، 1.1",
    "Letters to Lucilius, 7":
      "رسائل إلى لوسيليوس، 7",
    "Consilience, 1998":
      "Consilience، 1998",
    "Nicomachean Ethics, Book II":
      "الأخلاق النيقوماخية، الكتاب الثاني",
    "The Story of Philosophy, 1926":
      "قصة الفلسفة، 1926",
    "Field Theory in Social Science, 1951":
      "Field Theory in Social Science، 1951",
    "Advice for a Young Investigator, 1897":
      "Advice for a Young Investigator، 1897",
    "Scientific American, 1992":
      "مجلة Scientific American، 1992",
    "Why We Sleep, 2017":
      "لماذا ننام، 2017",
    "Aphorisms, 1.1":
      "الفصول، 1.1",
    "Epidemics, Book I":
      "أبيذيميا، المقالة الأولى",
    "Third Defence, 1538":
      "Third Defence، 1538",
    "1848":
      "1848",
    "Notes on Hospitals, 1863":
      "Notes on Hospitals، 1863",
    "Better, 2007":
      "Better، 2007",
    "Satire X":
      "الهجائية العاشرة",
    "1878":
      "1878",
    "1855":
      "1855",
    "Politics":
      "السياسة",
    "1954":
      "1954",
    "Doubts Concerning Ptolemy, c. 1028":
      "الشكوك على بطليموس، نحو 1028",
    "Lecture at Lille, 1854":
      "محاضرة في ليل، 1854",
    "Cargo Cult Science, 1974":
      "Cargo Cult Science، 1974",
    "Letter to Robert Hooke, 1675":
      "رسالة إلى روبرت هوك، 1675",
    "reported by at-Tirmidhi":
      "أورده الترمذي",
    "al-Fawa’id":
      "الفوائد",
    "Sayd al-Khatir":
      "صيد الخاطر",
    "On the Shortness of Life":
      "عن قِصَر الحياة",
    "Letters to Lucilius, 1":
      "رسائل إلى لوسيليوس، 1",
    "Meditations, II.5":
      "التأملات، II.5",
    "Speech, 1957":
      "خطاب، 1957",
    "Harvard Business Review, 1963":
      "مجلة Harvard Business Review، 1963",
    "Poor Richard’s Almanack, 1748":
      "Poor Richard’s Almanack، 1748",
    "Tao Te Ching, 64":
      "تاو تي تشينغ، 64",
    "The Hare and the Tortoise":
      "الأرنب والسلحفاة",
  },
  hadith: {},
  sayings: {
    "The great thing, then, in all education, is to make our nervous system our ally instead of our enemy.":
      "فالأمر العظيم إذن في كل تربية هو أن نجعل جهازنا العصبي حليفًا لنا لا عدوًا.",
    "Seize the very first possible opportunity to act on every resolution you make, and on every emotional prompting you may experience in the direction of the habits you aspire to gain.":
      "اغتنم أول فرصة ممكنة لتعمل بكل عزم تعقده، وبكل دافع وجداني تشعر به نحو العادات التي تطمح إلى اكتسابها.",
    "Never suffer an exception to occur till the new habit is securely rooted in your life.":
      "لا تسمح بأي استثناء حتى تترسخ العادة الجديدة في حياتك رسوخًا تامًا.",
    "My experience is what I agree to attend to.":
      "تجربتي هي ما أرضى أن أوليه انتباهي.",
    "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one’s attitude in any given set of circumstances, to choose one’s own way.":
      "يمكن أن يُسلب من الإنسان كل شيء إلا شيئًا واحدًا: آخر الحريات الإنسانية — أن يختار موقفه في أي ظرف من الظروف، وأن يختار طريقه بنفسه.",
    "When we are no longer able to change a situation, we are challenged to change ourselves.":
      "حين نعجز عن تغيير موقف ما، نجد أنفسنا أمام تحدي تغيير أنفسنا.",
    "He who has a why to live for can bear almost any how.":
      "من كان لديه «لماذا» يعيش من أجله، استطاع أن يحتمل أي «كيف» تقريبًا.",
    "Nothing in life is as important as you think it is, while you are thinking about it.":
      "لا شيء في الحياة مهم بالقدر الذي تظنه وأنت تفكر فيه.",
    "We can be blind to the obvious, and we are also blind to our blindness.":
      "قد نعمى عن الواضح، بل نعمى كذلك عن عمانا.",
    "The curious paradox is that when I accept myself just as I am, then I can change.":
      "المفارقة العجيبة أنني حين أتقبل نفسي كما أنا تمامًا، أصبح قادرًا على التغيّر.",
    "The best moments usually occur when a person’s body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile.":
      "أفضل اللحظات تأتي عادة حين يُدفع جسد المرء أو عقله إلى أقصى حدوده في جهد طوعي لإنجاز أمر صعب وجدير بالعناء.",
    "I suppose it is tempting, if the only tool you have is a hammer, to treat everything as if it were a nail.":
      "أظن أنه من المغري، إن كانت المطرقة أداتك الوحيدة، أن تعامل كل شيء كأنه مسمار.",
    "Enthusiasm is common. Endurance is rare.":
      "الحماس شائع. أما المثابرة فنادرة.",
    "You do not rise to the level of your goals. You fall to the level of your systems.":
      "أنت لا ترتقي إلى مستوى أهدافك، بل تهبط إلى مستوى أنظمتك.",
    "Every action you take is a vote for the type of person you wish to become.":
      "كل فعل تقوم به صوتٌ تمنحه لنوع الشخص الذي تريد أن تصبحه.",
    "Good relationships keep us happier and healthier. Period.":
      "العلاقات الجيدة تجعلنا أسعد وأصح. وكفى.",
    "People are disturbed not by things, but by the views they take of them.":
      "ليست الأشياء ما يقلق الناس، بل آراؤهم فيها.",
    "We suffer more often in imagination than in reality.":
      "نحن نتألم في الخيال أكثر مما نتألم في الواقع.",
    "Work expands so as to fill the time available for its completion.":
      "يتمدد العمل ليملأ الوقت المتاح لإنجازه.",
    "Hofstadter’s Law: it always takes longer than you expect, even when you take into account Hofstadter’s Law.":
      "قانون هوفستادتر: يستغرق الأمر دائمًا وقتًا أطول مما تتوقع، حتى حين تأخذ قانون هوفستادتر في الحسبان.",
    "I looked for one aim that all people agree is good and all pursue, and found only one: to drive away worry.":
      "تطلبتُ غرضًا يستوي الناس كلهم في استحسانه وفي طلبه، فلم أجده إلا واحدًا، وهو طرد الهم.",
    "A habit is a firmly rooted quality acquired by doing a certain action and repeating it time after time, until the form of that action is firmly fixed.":
      "الملكة صفة راسخة تحصل عن استعمال ذلك الفعل وتكرره مرة بعد أخرى حتى ترسخ صورته.",
    "Knowledge without action is madness, and action without knowledge does not come to be.":
      "العلم بلا عمل جنون، والعمل بغير علم لا يكون.",
    "Learning without thought is labour lost; thought without learning is perilous.":
      "التعلم بلا تفكير جهد ضائع؛ والتفكير بلا تعلم محفوف بالخطر.",
    "Is it not a pleasure to learn, and to practise from time to time what you have learned?":
      "أليس من دواعي السرور أن تتعلم، ثم تمارس ما تعلمته بين حين وآخر؟",
    "While we teach, we learn.":
      "إننا نتعلم حين نعلّم.",
    "We are drowning in information, while starving for wisdom.":
      "نحن نغرق في المعلومات، ونتضوّر جوعًا إلى الحكمة.",
    "We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.":
      "نصير عادلين بفعل الأفعال العادلة، ومعتدلين بفعل الأفعال المعتدلة، وشجعانًا بفعل الأفعال الشجاعة.",
    "We are what we repeatedly do. Excellence, then, is not an act, but a habit.":
      "نحن ما نفعله مرارًا وتكرارًا. فالإتقان إذن ليس فعلًا، بل عادة.",
    "There is nothing so practical as a good theory.":
      "لا شيء أكثر عملية من نظرية جيدة.",
    "Every man can, if he so desires, become the sculptor of his own brain.":
      "يستطيع كل إنسان، إن أراد، أن يصبح نحّات دماغه.",
    "Cells that fire together wire together.":
      "الخلايا التي تنشط معًا تترابط معًا.",
    "Sleep is the single most effective thing we can do to reset our brain and body health each day.":
      "النوم هو أنجع ما يمكننا فعله لنعيد ضبط صحة الدماغ والجسد كل يوم.",
    "Life is short, the art long, opportunity fleeting, experiment treacherous, judgement difficult.":
      "العمر قصير، والصناعة طويلة، والوقت ضيق، والتجربة خطر، والقضاء عسر.",
    "As to diseases, make a habit of two things — to help, or at least to do no harm.":
      "اجعل من عادتك في الأمراض أمرين — أن تنفع، أو على الأقل ألا تضر.",
    "Wherever the art of medicine is loved, there is also a love of humanity.":
      "حيثما وُجد حب فن الطب، وُجد معه حب الإنسانية.",
    "All things are poison, and nothing is without poison; only the dose makes a thing not a poison.":
      "كل الأشياء سم، ولا شيء يخلو من السم؛ والجرعة وحدها هي ما يجعل الشيء غير سام.",
    "To cure sometimes, to relieve often, to comfort always.":
      "أن تشفي أحيانًا، وأن تخفف كثيرًا، وأن تواسي دائمًا.",
    "If the physician can heal with food rather than medicine, he has succeeded; and if he must use medicine, let it be a simple one rather than a compound.":
      "إن استطاع الطبيب أن يعالج بالغذاء دون الدواء فقد وُفّق؛ وإن اضطر إلى الدواء فليكن مفردًا لا مركبًا.",
    "The good physician treats the disease; the great physician treats the patient who has the disease.":
      "الطبيب الجيد يعالج المرض؛ والطبيب العظيم يعالج المريض المصاب بالمرض.",
    "Listen to your patient; he is telling you the diagnosis.":
      "أنصت إلى مريضك؛ فهو يخبرك بالتشخيص.",
    "Medicine is a science of uncertainty and an art of probability.":
      "الطب علم اللايقين وفن الاحتمال.",
    "Medicine is a social science, and politics is nothing else but medicine on a large scale.":
      "الطب علم اجتماعي، وما السياسة إلا طب على نطاق واسع.",
    "It may seem a strange principle to enunciate as the very first requirement in a hospital that it should do the sick no harm.":
      "قد يبدو مبدأً غريبًا أن يُنصّ على أن أول ما يُشترط في المستشفى ألا يُلحق الأذى بالمرضى.",
    "Better is possible. It does not take genius. It takes diligence. It takes moral clarity. It takes ingenuity. And above all, it takes a willingness to try.":
      "الأفضل ممكن. لا يتطلب عبقرية. يتطلب اجتهادًا. يتطلب وضوحًا أخلاقيًا. يتطلب براعة. وفوق كل شيء، يتطلب استعدادًا للمحاولة.",
    "You should pray for a sound mind in a sound body.":
      "عليك أن تدعو بعقل سليم في جسم سليم.",
    "The constancy of the internal environment is the condition for a free and independent life.":
      "ثبات البيئة الداخلية شرط لحياة حرة مستقلة.",
    "Omnis cellula e cellula — every cell comes from a cell.":
      "Omnis cellula e cellula — كل خلية تأتي من خلية.",
    "Nature does nothing in vain.":
      "الطبيعة لا تفعل شيئًا عبثًا.",
    "Anything found to be true of E. coli must also be true of elephants.":
      "ما يثبت صحته على بكتيريا الإشريكية القولونية لا بد أن يصح على الفيلة أيضًا.",
    "The more clearly we can focus our attention on the wonders and realities of the universe about us, the less taste we shall have for destruction.":
      "كلما ركزنا انتباهنا بوضوح أكبر على عجائب الكون من حولنا وحقائقه، قلّت رغبتنا في التدمير.",
    "The duty of the one who studies the writings of scientists, if learning the truth is his goal, is to make himself an enemy of all that he reads — and to suspect himself as well, so that he falls into neither prejudice nor leniency.":
      "الواجب على الناظر في كتب العلوم، إذا كان غرضه معرفة الحقائق، أن يجعل نفسه خصمًا لكل ما ينظر فيه… ويتهم أيضًا نفسه عند خصامه، فلا يتحامل عليه ولا يتسمح فيه.",
    "In the fields of observation, chance favours only the prepared mind.":
      "في ميادين الملاحظة، لا تحالف الصدفة إلا العقل المستعد.",
    "The first principle is that you must not fool yourself — and you are the easiest person to fool.":
      "المبدأ الأول ألا تخدع نفسك — وأنت أسهل من يمكن خداعه.",
    "If I have seen further it is by standing on the shoulders of giants.":
      "إن كنت قد رأيت أبعد، فذلك لأنني وقفت على أكتاف العمالقة.",
    "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.":
      "لا شيء في الحياة يدعو إلى الخوف، بل إلى الفهم فحسب. والآن هو وقت أن نفهم أكثر، لكي نخاف أقل.",
    "Wasting time is worse than death, for wasting time cuts you off from Allah and the Hereafter, while death cuts you off only from this world and its people.":
      "إضاعة الوقت أشد من الموت؛ لأن إضاعة الوقت تقطعك عن الله والدار الآخرة، والموت يقطعك عن الدنيا وأهلها.",
    "O son of Adam, you are nothing but a number of days; whenever a day passes, a part of you is gone.":
      "يا ابن آدم، إنما أنت أيام، كلما ذهب يوم ذهب بعضك.",
    "A person should know the honour of his time and the worth of his hours, and not waste a single moment of it on anything but what brings him closer to Allah.":
      "ينبغي للإنسان أن يعرف شرف زمانه وقدر وقته، فلا يضيّع منه لحظة في غير قربة.",
    "It is not that we have a short time to live, but that we waste a lot of it.":
      "ليس الأمر أن وقتنا في الحياة قصير، بل أننا نضيّع منه الكثير.",
    "While we are postponing, life speeds by.":
      "بينما نؤجّل، تمضي الحياة مسرعة.",
    "Do every act of your life as if it were your last.":
      "افعل كل فعل في حياتك كأنه آخر أفعالك.",
    "Plans are worthless, but planning is everything.":
      "الخطط لا قيمة لها، لكن التخطيط هو كل شيء.",
    "There is surely nothing quite so useless as doing with great efficiency what should not be done at all.":
      "لا شيء أقل جدوى من أن تؤدي بكفاءة عالية ما لا ينبغي فعله أصلًا.",
    "Lost time is never found again.":
      "الوقت الضائع لا يُستعاد أبدًا.",
    "A journey of a thousand miles begins beneath one’s feet.":
      "رحلة الألف ميل تبدأ من تحت قدميك.",
    "Rien ne sert de courir ; il faut partir à point. — Running is no use; one must set off on time.":
      "Rien ne sert de courir ; il faut partir à point. — لا فائدة من الركض؛ بل ينبغي الانطلاق في الوقت المناسب.",
    "Petit à petit, l’oiseau fait son nid. — Little by little, the bird builds its nest.":
      "Petit à petit, l’oiseau fait son nid. — شيئًا فشيئًا، يبني الطائر عشه.",
    "Paris ne s’est pas fait en un jour. — Paris was not built in a day.":
      "Paris ne s’est pas fait en un jour. — باريس لم تُبنَ في يوم واحد.",
    "Fall seven times, stand up eight.":
      "اسقط سبع مرات، وانهض ثمانيًا.",
    "The best time to plant a tree was twenty years ago. The second best time is now.":
      "أفضل وقت لغرس شجرة كان قبل عشرين عامًا. وثاني أفضل وقت هو الآن.",
    "Poco a poco se va lejos. — Little by little, one goes far.":
      "Poco a poco se va lejos. — شيئًا فشيئًا، يبلغ المرء البعيد.",
  },
  facts: {
    "In a study of new daily habits, it took 66 days on average for a habit to feel automatic — anywhere from 18 to 254 days — and missing a single day did not derail it.":
      "في دراسة عن عادات يومية جديدة، احتاجت العادة إلى 66 يومًا في المتوسط لتصبح تلقائية — بين 18 و254 يومًا — ولم يُفسدها تفويت يوم واحد.",
    "Spreading study over several days beats cramming the same hours into one sitting. The spacing effect is one of the most replicated findings in psychology.":
      "توزيع المذاكرة على عدة أيام يتفوق على حشر الساعات نفسها في جلسة واحدة. وأثر التباعد من أكثر نتائج علم النفس ثبوتًا عند إعادة التجارب.",
    "Recalling something from memory strengthens it more than re-reading it. Students who practised recall remembered far more a week later than students who re-studied.":
      "استرجاع المعلومة من الذاكرة يقوّيها أكثر من إعادة قراءتها. فالطلاب الذين تدربوا على الاسترجاع تذكروا بعد أسبوع أكثر بكثير ممن أعادوا المذاكرة.",
    "Without review, much of what we learn is forgotten within a day. Each well-timed review flattens the “forgetting curve”.":
      "دون مراجعة، يُنسى كثير مما نتعلمه في غضون يوم. وكل مراجعة في وقتها المناسب تخفّف انحدار «منحنى النسيان».",
    "Plans in the form “When X happens, I will do Y” make people noticeably more likely to follow through — a medium-to-large effect across 94 studies.":
      "الخطط التي تأتي في صيغة «إذا حدث س، فسأفعل ص» تجعل الناس أكثر التزامًا بالتنفيذ بشكل ملحوظ — بأثر متوسط إلى كبير عبر 94 دراسة.",
    "People are more likely to start working on a goal after a “fresh start” — a new week, a new month, a birthday or a new year.":
      "يميل الناس أكثر إلى البدء في هدف بعد «بداية جديدة» — أسبوع جديد، أو شهر جديد، أو يوم ميلاد، أو سنة جديدة.",
    "We speed up as a goal comes into sight: coffee-card customers bought coffee more often the closer they got to a free one.":
      "نسرّع خطانا حين يلوح الهدف في الأفق: فزبائن بطاقات القهوة صاروا يشترون القهوة أكثر كلما اقتربوا من الحصول على قهوة مجانية.",
    "A car-wash card needing 10 stamps with 2 already given was completed far more often (34%) than a card needing 8 stamps (19%). Feeling that you have started helps you finish.":
      "بطاقة غسيل سيارات تحتاج إلى 10 أختام مُنح منها ختمان مسبقًا اكتملت أكثر بكثير (34%) من بطاقة تحتاج إلى 8 أختام (19%). الشعور بأنك بدأت يساعدك على الإنهاء.",
    "In nearly 12,000 diary entries from 238 professionals, the most common event on people’s best days was simply making progress in meaningful work.":
      "في نحو 12,000 تدوينة يومية كتبها 238 مهنيًا، كان أكثر ما يتكرر في أفضل أيامهم هو ببساطة إحراز تقدم في عمل ذي معنى.",
    "Students asked when they would finish their thesis finished later, on average, than even their own “worst case” estimate. Plan for longer than feels necessary.":
      "الطلاب الذين سُئلوا متى سينهون أطروحاتهم أنهوها في المتوسط بعد الموعد الذي توقعوه هم أنفسهم في «أسوأ الاحتمالات». خطّط لمدة أطول مما يبدو لازمًا.",
    "We judge an experience mostly by its peak and its end. People preferred a longer cold-water trial if its last 30 seconds were slightly warmer.":
      "نحكم على التجربة غالبًا من ذروتها ونهايتها. فقد فضّل المشاركون تجربة ماء بارد أطول إذا كانت آخر 30 ثانية منها أدفأ قليلًا.",
    "Information you produce yourself — completing a word, answering a question — is remembered better than the same information simply read.":
      "المعلومات التي تنتجها بنفسك — كإكمال كلمة أو الإجابة عن سؤال — تُتذكَّر أفضل من المعلومات نفسها حين تُقرأ فحسب.",
    "Mixing different kinds of problems in one practice session feels harder than doing one kind at a time, but leads to better results on later tests.":
      "خلط أنواع مختلفة من المسائل في جلسة تدريب واحدة يبدو أصعب من التدرب على نوع واحد في كل مرة، لكنه يؤدي إلى نتائج أفضل في الاختبارات اللاحقة.",
    "Trying to answer questions before you study a topic improves learning — even when your first answers are wrong.":
      "محاولة الإجابة عن الأسئلة قبل دراسة موضوع ما تحسّن التعلم — حتى حين تكون إجاباتك الأولى خاطئة.",
    "“Desirable difficulties” — spacing, self-testing, mixing topics — make study feel slower but make what you learn last longer.":
      "«الصعوبات المرغوبة» — التباعد، واختبار النفس، وخلط الموضوعات — تجعل المذاكرة تبدو أبطأ، لكنها تجعل ما تتعلمه يدوم أطول.",
    "People who learn something expecting to teach it organise it better and recall more than people who learn it only for a test.":
      "من يتعلمون شيئًا وهم يتوقعون أن يعلّموه ينظّمونه أفضل ويتذكرون أكثر ممن يتعلمونه لاختبار فقط.",
    "In English, the 2,000 most common word families make up roughly 80% of the words in a typical text — a strong reason to learn frequent words first.":
      "في الإنجليزية، تشكّل أكثر 2,000 أسرة لفظية شيوعًا نحو 80% من كلمات النص المعتاد — وهذا سبب قوي لتعلّم الكلمات الشائعة أولًا.",
    "At CEFR level B1 you can deal with most situations while travelling, describe experiences, dreams and ambitions, and give brief reasons for your opinions.":
      "في المستوى B1 من الإطار الأوروبي المرجعي (CEFR) تستطيع التعامل مع معظم المواقف أثناء السفر، ووصف التجارب والأحلام والطموحات، وتقديم أسباب موجزة لآرائك.",
    "Babies can tell apart the speech sounds of every language, but by about 10–12 months they become tuned to the sounds of the languages around them.":
      "يستطيع الرضّع التمييز بين الأصوات الكلامية في كل اللغات، لكنهم بحلول عمر 10–12 شهرًا تقريبًا يتكيّفون مع أصوات اللغات التي يسمعونها حولهم.",
    "Every switch between tasks costs time, and the cost grows with the complexity of the tasks — a hidden tax on multitasking.":
      "كل انتقال بين المهام يكلّف وقتًا، وتزداد هذه الكلفة بازدياد تعقيد المهام — ضريبة خفية على تعدد المهام.",
    "In a test combining driving with a memory task, only about 2.5% of people did both without getting worse at either.":
      "في اختبار جمع بين القيادة ومهمة تتطلب الذاكرة، لم ينجح في أداء الاثنتين دون تراجع في أي منهما إلا نحو 2.5% من الناس.",
    "Working memory holds only about four chunks of information at once — fewer than the “seven, plus or minus two” often quoted.":
      "لا تحتفظ الذاكرة العاملة إلا بنحو أربع وحدات من المعلومات في وقت واحد — أقل من «سبعة، زائد أو ناقص اثنين» التي يكثر الاستشهاد بها.",
    "About half of people counting basketball passes in a video failed to notice a person in a gorilla suit walking through the scene.":
      "نحو نصف من كانوا يعدّون تمريرات كرة السلة في مقطع فيديو لم ينتبهوا إلى شخص يرتدي زي غوريلا يعبر المشهد.",
    "Naming the ink colour of a word like “RED” printed in blue is slow, because reading is so automatic that it gets in the way.":
      "تسمية لون الحبر لكلمة مثل «أحمر» مطبوعة بالأزرق بطيئة، لأن القراءة صارت تلقائية إلى حد أنها تتداخل مع التسمية.",
    "We tend to like things more simply because we have seen them more often — the mere-exposure effect.":
      "نميل إلى حب الأشياء أكثر لمجرد أننا رأيناها أكثر — وهذا هو أثر التعرض المجرد.",
    "In Stanford experiments, people came up with more creative ideas while walking than while sitting, and the boost lasted for a while after they sat down.":
      "في تجارب جامعة ستانفورد، أتى الناس بأفكار أكثر إبداعًا وهم يمشون مقارنة بجلوسهم، واستمر هذا التحسن مدة بعد أن جلسوا.",
    "Across 148 studies of over 300,000 people, those with stronger social relationships had about a 50% greater likelihood of survival during the study periods.":
      "عبر 148 دراسة شملت أكثر من 300,000 شخص، كان لدى أصحاب العلاقات الاجتماعية الأقوى احتمال بقاء على قيد الحياة أعلى بنحو 50% خلال فترات الدراسة.",
    "The longest study of adult life found that warm relationships, more than money or fame, best predicted who stayed healthy and happy into old age.":
      "وجدت أطول دراسة عن حياة البالغين أن العلاقات الدافئة، أكثر من المال أو الشهرة، كانت أفضل ما تنبأ بمن ظل بصحة جيدة وسعيدًا حتى الشيخوخة.",
    "Writing about a difficult experience for 15–20 minutes on a few days has been linked to modest improvements in health and wellbeing.":
      "ارتبطت الكتابة عن تجربة صعبة مدة 15–20 دقيقة في أيام قليلة بتحسن متواضع في الصحة والعافية.",
    "People who listed things they were grateful for each week felt more optimistic about the coming week than those who listed hassles.":
      "من دوّنوا كل أسبوع أشياء يشعرون بالامتنان لها كانوا أكثر تفاؤلًا بالأسبوع المقبل ممن دوّنوا المنغّصات.",
    "Patients with irritable bowel syndrome who were openly told they were taking placebo pills still reported more relief than patients given nothing.":
      "مرضى القولون العصبي الذين أُخبروا صراحة أنهم يتناولون حبوبًا وهمية أفادوا مع ذلك بارتياح أكبر من المرضى الذين لم يُعطوا شيئًا.",
    "In a study of nearly 20,000 people in England, spending at least 120 minutes a week in nature was linked to better health and wellbeing.":
      "في دراسة شملت نحو 20,000 شخص في إنجلترا، ارتبط قضاء 120 دقيقة على الأقل أسبوعيًا في الطبيعة بصحة وعافية أفضل.",
    "Walking or jogging, yoga and strength training all gave meaningful reductions in symptoms of depression in a review of 218 trials.":
      "المشي أو الهرولة، واليوغا، وتمارين القوة كلها خفّضت أعراض الاكتئاب تخفيضًا ملموسًا في مراجعة شملت 218 تجربة.",
    "The human brain has about 86 billion neurons.":
      "يحتوي الدماغ البشري على نحو 86 مليار خلية عصبية.",
    "Your brain is about 2% of your body weight but uses roughly 20% of its energy at rest.":
      "يشكّل دماغك نحو 2% من وزن جسمك، لكنه يستهلك قرابة 20% من طاقته في أثناء الراحة.",
    "The brain runs on about 20 watts — roughly the power of a dim light bulb.":
      "يعمل الدماغ بنحو 20 واط — أي قرابة قدرة مصباح خافت.",
    "London taxi drivers, who memorise thousands of streets, have a larger rear hippocampus than other people, and it is larger the longer they have driven.":
      "سائقو سيارات الأجرة في لندن، الذين يحفظون آلاف الشوارع، لديهم حُصين خلفي أكبر من غيرهم، ويزداد حجمه كلما طالت مدة قيادتهم.",
    "A year of brisk walking three times a week grew the hippocampus of older adults by about 2% — reversing one to two years of age-related shrinkage.":
      "عام من المشي السريع ثلاث مرات أسبوعيًا زاد حجم الحُصين لدى كبار السن بنحو 2% — أي عكس ما بين سنة وسنتين من الضمور المرتبط بالعمر.",
    "Adults who learned to juggle showed measurable changes in brain grey matter within three months. Learning reshapes the brain at every age.":
      "البالغون الذين تعلموا قذف الكرات وتلقّفها في الهواء أظهروا تغيرات قابلة للقياس في المادة الرمادية للدماغ خلال ثلاثة أشهر. التعلم يعيد تشكيل الدماغ في كل عمر.",
    "In sleeping mice the space between brain cells grows by about 60%, letting fluid flush out waste such as beta-amyloid. Sleep is when the brain cleans itself.":
      "لدى الفئران النائمة تتسع المسافة بين خلايا الدماغ بنحو 60%، فيتدفق السائل ليطرد الفضلات مثل بيتا أميلويد. النوم هو الوقت الذي ينظّف فيه الدماغ نفسه.",
    "During sleep the brain replays recent experiences, which helps turn the day’s learning into lasting memory.":
      "في أثناء النوم يعيد الدماغ تشغيل التجارب الحديثة، مما يساعد على تحويل ما تعلمته في يومك إلى ذاكرة دائمة.",
    "The brain itself has no pain receptors, which is why some brain surgery can be done while the patient is awake.":
      "الدماغ نفسه لا يحتوي على مستقبلات للألم، ولهذا يمكن إجراء بعض جراحات الدماغ والمريض مستيقظ.",
    "Signals in the fastest nerve fibres travel at over 100 metres per second, thanks to the fatty myelin sheath around them.":
      "تنتقل الإشارات في أسرع الألياف العصبية بأكثر من 100 متر في الثانية، بفضل غمد الميالين الدهني المحيط بها.",
    "The hippocampus, central to memory, is named after the Greek word for seahorse because of its curled shape.":
      "سُمّي الحُصين، المحوري في الذاكرة، بالكلمة اليونانية التي تعني «فرس البحر» بسبب شكله الملتف.",
    "In 1848 Phineas Gage survived an iron rod passing through the front of his brain. The change in his personality helped show what the frontal lobes do.":
      "في عام 1848 نجا فينياس غيج من قضيب حديدي اخترق مقدمة دماغه. وساعد التغير في شخصيته على كشف وظيفة الفصوص الجبهية.",
    "After surgery in 1953, the patient known as H.M. could no longer form new memories of events — yet he could still learn new motor skills, revealing separate memory systems.":
      "بعد جراحة عام 1953، لم يعد المريض المعروف باسم H.M. قادرًا على تكوين ذكريات جديدة عن الأحداث — لكنه ظل قادرًا على تعلم مهارات حركية جديدة، مما كشف عن أنظمة ذاكرة منفصلة.",
    "Smell is closely tied to memory and emotion: the olfactory bulb connects directly to the amygdala and hippocampus.":
      "الشم وثيق الصلة بالذاكرة والعاطفة: فالبصلة الشمية تتصل مباشرة باللوزة الدماغية والحُصين.",
    "The gut has its own nervous system, with roughly 500 million neurons — sometimes called the “second brain”.":
      "للأمعاء جهاز عصبي خاص بها، فيه نحو 500 مليون خلية عصبية — ويُسمّى أحيانًا «الدماغ الثاني».",
    "About 90% of the body’s serotonin is made in the gut, not the brain.":
      "يُنتَج نحو 90% من السيروتونين في الجسم في الأمعاء، لا في الدماغ.",
    "Your body has about 30 trillion human cells and a similar number of bacteria. The old claim of “ten bacteria for every cell” was wrong.":
      "في جسمك نحو 30 تريليون خلية بشرية وعدد مماثل تقريبًا من البكتيريا. أما الزعم القديم بأن هناك «عشر خلايا بكتيرية مقابل كل خلية» فكان خاطئًا.",
    "Red blood cells live about 120 days, and your body makes around two million new ones every second.":
      "تعيش خلايا الدم الحمراء نحو 120 يومًا، ويصنع جسمك قرابة مليوني خلية جديدة منها كل ثانية.",
    "Your heart beats about 100,000 times a day.":
      "ينبض قلبك نحو 100,000 مرة في اليوم.",
    "Your kidneys filter about 180 litres of blood plasma a day and return almost all of it; only one or two litres leave as urine.":
      "تُرشّح كليتاك نحو 180 لترًا من بلازما الدم يوميًا وتعيد امتصاصها كلها تقريبًا؛ ولا يخرج منها في البول إلا لتر أو لتران.",
    "The liver can grow back to its full size even after most of it — up to about two-thirds — has been removed.":
      "يستطيع الكبد أن ينمو من جديد إلى حجمه الكامل حتى بعد استئصال معظمه — ما يصل إلى نحو الثلثين.",
    "The lining of the small intestine renews itself every three to five days.":
      "تتجدد بطانة الأمعاء الدقيقة كل ثلاثة إلى خمسة أيام.",
    "Stomach acid has a pH of about 1.5 to 3.5. A layer of mucus keeps the stomach from digesting itself.":
      "تتراوح درجة حموضة المعدة (pH) بين نحو 1.5 و3.5. وتمنع طبقة من المخاط المعدة من هضم نفسها.",
    "Bone is living tissue: roughly 10% of the adult skeleton is replaced every year.":
      "العظم نسيج حي: إذ يُستبدل نحو 10% من الهيكل العظمي للبالغ كل عام.",
    "Babies are born with around 300 bones; many fuse as they grow, leaving 206 in adults.":
      "يولد الرضّع بنحو 300 عظمة؛ يلتحم كثير منها مع النمو، فيبقى لدى البالغين 206.",
    "Fingerprints form in the womb by about the fourth month, and even identical twins have different ones.":
      "تتكوّن بصمات الأصابع في الرحم بحلول الشهر الرابع تقريبًا، وحتى التوائم المتطابقة لها بصمات مختلفة.",
    "The cornea has no blood vessels; it takes its oxygen straight from the air.":
      "القرنية خالية من الأوعية الدموية؛ فهي تأخذ الأكسجين مباشرة من الهواء.",
    "Taste buds are replaced roughly every one to two weeks.":
      "تتجدد براعم التذوق كل أسبوع إلى أسبوعين تقريبًا.",
    "Uncoiled, the DNA in a single human cell would stretch about two metres.":
      "لو فُكّ الحمض النووي في خلية بشرية واحدة لامتد نحو مترين.",
    "Mitochondria, the power plants of the cell, have their own DNA — and you almost always inherit it from your mother alone.":
      "للميتوكوندريا، محطات الطاقة في الخلية، حمض نووي خاص بها — وأنت ترثه في جميع الحالات تقريبًا من أمك وحدها.",
    "The adult human body is roughly 50–60% water.":
      "يتكون جسم الإنسان البالغ من الماء بنسبة 50–60% تقريبًا.",
    "Cells break down and recycle their own worn-out parts, a process called autophagy. Its discovery won the 2016 Nobel Prize in Physiology or Medicine.":
      "تفكك الخلايا أجزاءها البالية وتعيد تدويرها، في عملية تُسمّى الالتهام الذاتي. وقد نال اكتشافها جائزة نوبل في الطب أو علم وظائف الأعضاء لعام 2016.",
    "A fever is part of the immune response: a higher temperature slows some pathogens and helps immune cells work.":
      "الحمّى جزء من الاستجابة المناعية: فارتفاع الحرارة يبطّئ بعض مسببات الأمراض ويساعد الخلايا المناعية على العمل.",
    "Antibiotics kill bacteria but do nothing against viruses such as colds and flu — and needless use breeds resistance.":
      "تقتل المضادات الحيوية البكتيريا لكنها لا تفعل شيئًا ضد الفيروسات مثل نزلات البرد والإنفلونزا — واستخدامها دون حاجة يولّد المقاومة.",
    "In 2019, bacteria resistant to antibiotics directly caused about 1.27 million deaths worldwide.":
      "في عام 2019، تسببت البكتيريا المقاومة للمضادات الحيوية مباشرة في نحو 1.27 مليون وفاة حول العالم.",
    "Adults need seven or more hours of sleep a night, regularly, for the best health.":
      "يحتاج البالغون إلى سبع ساعات نوم أو أكثر كل ليلة، بانتظام، لينعموا بأفضل صحة.",
    "Caffeine’s half-life in healthy adults is about five hours, so an afternoon coffee can still be working at bedtime.":
      "يبلغ عمر النصف للكافيين لدى البالغين الأصحاء نحو خمس ساعات، لذا قد يبقى مفعول قهوة العصر قائمًا عند موعد النوم.",
    "Caffeine taken even six hours before bed cut sleep by more than an hour in one controlled study.":
      "في إحدى الدراسات المضبوطة، قلّص الكافيين النوم بأكثر من ساعة، حتى حين كان تناوله قبل موعد النوم بست ساعات.",
    "The WHO recommends 150–300 minutes of moderate activity a week for adults, plus muscle-strengthening on two or more days.":
      "توصي منظمة الصحة العالمية بأن يمارس البالغون 150–300 دقيقة من النشاط المعتدل أسبوعيًا، إضافة إلى تمارين تقوية العضلات يومين أو أكثر.",
    "In a review of studies with over 220,000 people, each extra 1,000 steps a day was linked to about a 15% lower risk of death from any cause.":
      "في مراجعة لدراسات شملت أكثر من 220,000 شخص، ارتبطت كل 1,000 خطوة إضافية في اليوم بانخفاض نحو 15% في خطر الوفاة لأي سبب.",
    "Washing your hands with soap for at least 20 seconds removes far more germs than a quick rinse.":
      "غسل اليدين بالصابون مدة 20 ثانية على الأقل يزيل من الجراثيم أكثر بكثير من شطفهما على عجل.",
    "Long exposure to sounds above about 85 decibels — heavy traffic, loud earphones — can permanently damage hearing.":
      "التعرض الطويل لأصوات تتجاوز نحو 85 ديسيبل — كحركة المرور الكثيفة أو سماعات الأذن الصاخبة — قد يضر السمع ضررًا دائمًا.",
    "Children who spend more time outdoors are less likely to become short-sighted.":
      "الأطفال الذين يقضون وقتًا أطول في الهواء الطلق أقل عرضة لقصر النظر.",
    "For screen-tired eyes, eye-care groups suggest the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.":
      "للعيون المتعبة من الشاشات، تقترح هيئات العناية بالعيون قاعدة 20-20-20: كل 20 دقيقة، انظر إلى شيء على بعد 20 قدمًا مدة 20 ثانية.",
    "Your skin makes vitamin D when sunlight’s UVB rays reach it.":
      "يصنع جلدك فيتامين د حين تصله الأشعة فوق البنفسجية من النوع B في ضوء الشمس.",
    "One blood donation can help up to three people, once it is separated into red cells, plasma and platelets.":
      "يمكن لتبرع واحد بالدم أن يساعد ما يصل إلى ثلاثة أشخاص، بعد فصله إلى خلايا حمراء وبلازما وصفائح دموية.",
    "The Hippocratic Oath never says “first, do no harm”. The closest line is in Hippocrates’ Epidemics: “to help, or at least to do no harm”.":
      "قسم أبقراط لا يقول أبدًا «أولًا، لا تُلحق ضررًا». وأقرب عبارة إليه في كتاب أبقراط «أبيذيميا»: «أن تنفع، أو على الأقل ألا تضر».",
    "In 1847 Ignaz Semmelweis made doctors wash their hands in chlorinated lime; deaths of new mothers on his ward fell from about 18% to around 2%.":
      "في عام 1847 ألزم إغناتس زملفايس الأطباء بغسل أيديهم بالجير المكلور؛ فانخفضت وفيات الأمهات حديثات الولادة في جناحه من نحو 18% إلى قرابة 2%.",
    "In 1747 James Lind gave scurvy-stricken sailors different remedies; those given oranges and lemons recovered — one of the first controlled clinical trials.":
      "في عام 1747 أعطى جيمس ليند بحارة مصابين بالإسقربوط علاجات مختلفة؛ فتعافى من أُعطوا البرتقال والليمون — في واحدة من أولى التجارب السريرية المضبوطة.",
    "Smallpox is the only human disease ever eradicated; the WHO declared it gone in 1980.":
      "الجدري هو المرض البشري الوحيد الذي استؤصل على الإطلاق؛ وقد أعلنت منظمة الصحة العالمية القضاء عليه عام 1980.",
    "Edward Jenner’s 1796 smallpox vaccine used material from cowpox — “vaccine” comes from the Latin vacca, cow.":
      "استخدم لقاح الجدري الذي طوّره إدوارد جينر عام 1796 مادة من جدري البقر — وكلمة «vaccine» (لقاح) مشتقة من اللاتينية vacca، أي البقرة.",
    "Alexander Fleming discovered penicillin in 1928 after mould contaminated one of his bacteria plates.":
      "اكتشف ألكسندر فليمنغ البنسلين عام 1928 بعد أن لوّث العفن أحد أطباق البكتيريا لديه.",
    "Insulin was first used to treat a person with diabetes in 1922, in Toronto. Before that, type 1 diabetes was fatal.":
      "استُخدم الإنسولين لأول مرة لعلاج مريض بالسكري عام 1922، في تورنتو. وقبل ذلك كان السكري من النوع الأول قاتلًا.",
    "Ibn Sina’s Canon of Medicine (1025) was still a medical textbook in European universities in the 1600s.":
      "ظل كتاب «القانون في الطب» لابن سينا (1025) كتابًا دراسيًا في الجامعات الأوروبية حتى القرن السابع عشر.",
    "Abu Bakr al-Razi (c. 865–925) wrote one of the first clear accounts telling smallpox and measles apart.":
      "كتب أبو بكر الرازي (نحو 865–925) من أوائل الأوصاف الواضحة التي تميّز الجدري من الحصبة.",
    "Ibn al-Nafis (1213–1288) described blood passing through the lungs — the pulmonary circulation — centuries before it was described in Europe.":
      "وصف ابن النفيس (1213–1288) مرور الدم عبر الرئتين — أي الدورة الدموية الصغرى — قبل وصفها في أوروبا بقرون.",
    "Al-Zahrawi (d. c. 1013) wrote al-Tasrif, whose volume on surgery illustrated some 200 surgical instruments.":
      "ألّف الزهراوي (تُوفي نحو 1013) كتاب «التصريف»، الذي صوّر جزؤه المخصص للجراحة نحو 200 أداة جراحية.",
    "Hospitals of the medieval Islamic world, such as al-Mansuri in Cairo (1284), treated patients free of charge and had separate wards, including for mental illness.":
      "كانت مستشفيات العالم الإسلامي في العصور الوسطى، مثل البيمارستان المنصوري في القاهرة (1284)، تعالج المرضى مجانًا، وفيها أجنحة منفصلة، منها جناح للأمراض النفسية.",
    "Around the year 900, Abu Zayd al-Balkhi wrote “Sustenance for Body and Soul”, treating mental health alongside physical health and describing treatments for fear, anxiety and sadness.":
      "نحو عام 900، كتب أبو زيد البلخي «مصالح الأبدان والأنفس»، فتناول الصحة النفسية إلى جانب الصحة البدنية، ووصف علاجات للخوف والقلق والحزن.",
    "Ibn al-Haytham (c. 965–1040) showed in his Book of Optics that we see because light enters the eye — and insisted that ideas be tested by experiment.":
      "بيّن ابن الهيثم (نحو 965–1040) في «كتاب المناظر» أننا نرى لأن الضوء يدخل العين — وأصرّ على أن تُختبر الأفكار بالتجربة.",
    "The words “algorithm” and “algebra” come from al-Khwarizmi: “algorithm” from his name, “algebra” from his book al-Jabr.":
      "كلمتا «algorithm» (خوارزمية) و«algebra» (جبر) جاءتا من الخوارزمي: الأولى من اسمه، والثانية من كتابه «الجبر».",
    "Al-Qarawiyyin in Fez, founded by Fatima al-Fihri in 859, is often cited as the oldest university still operating.":
      "كثيرًا ما يُستشهد بجامعة القرويين في فاس، التي أسستها فاطمة الفهرية عام 859، على أنها أقدم جامعة ما زالت تعمل.",
    "Many science words come from Arabic: algebra, alkali, alcohol, zenith — and star names such as Aldebaran, Altair and Betelgeuse.":
      "كثير من الكلمات العلمية أصلها عربي: algebra (الجبر)، alkali (القلي)، alcohol (الكحول)، zenith (السمت) — وأسماء نجوم مثل Aldebaran (الدبران)، Altair (النسر الطائر)، Betelgeuse (يد الجوزاء).",
    "An octopus has three hearts and blue, copper-based blood.":
      "للأخطبوط ثلاثة قلوب ودم أزرق قائم على النحاس.",
    "Tardigrades — tiny “water bears” — survived exposure to open space on a satellite in 2007.":
      "نجت بطيئات المشية — «دببة الماء» الدقيقة — من التعرض للفضاء المفتوح على متن قمر صناعي عام 2007.",
    "Botanically, bananas are berries and strawberries are not.":
      "يُعدّ الموز من الناحية النباتية ثمرة لُبّية (berry)، أما الفراولة فلا.",
    "Sealed honey keeps almost indefinitely: it holds so little water and is so acidic that microbes cannot grow in it.":
      "العسل المحكم الإغلاق يبقى صالحًا إلى أجل غير محدود تقريبًا: فهو قليل الماء جدًا وحمضي إلى حد لا تستطيع الميكروبات النمو فيه.",
    "Honeybees tell each other the direction and distance of food with a “waggle dance”.":
      "يُخبر نحل العسل بعضه بعضًا باتجاه الغذاء ومسافته عبر «رقصة الاهتزاز».",
    "Sharks existed before trees: sharks appeared over 400 million years ago, the first forests about 385 million years ago.":
      "وُجدت أسماك القرش قبل الأشجار: فقد ظهرت أسماك القرش قبل أكثر من 400 مليون سنة، وأول الغابات قبل نحو 385 مليون سنة.",
    "Roughly half of the oxygen we breathe is produced by tiny ocean plankton.":
      "نحو نصف الأكسجين الذي نتنفسه تنتجه عوالق دقيقة في المحيطات.",
    "Crows recognise individual human faces and remember them for years — and tell other crows about people they dislike.":
      "تتعرف الغربان على وجوه البشر كلًّا على حدة وتتذكرها سنوات — وتخبر الغربان الأخرى عن الأشخاص الذين لا تحبهم.",
    "The blue whale is the largest animal known to have ever lived.":
      "الحوت الأزرق أكبر حيوان عُرف أنه عاش على الإطلاق.",
    "Axolotls can regrow lost limbs, parts of their heart and even their spinal cord.":
      "يستطيع الأكسولوتل أن يعيد إنماء أطرافه المفقودة، وأجزاء من قلبه، بل حتى حبله الشوكي.",
    "A cheetah can reach around 100 km/h in a short sprint.":
      "يستطيع الفهد أن يبلغ نحو 100 كم/ساعة في عدو قصير.",
    "Bar-tailed godwits fly more than 11,000 km nonstop from Alaska to New Zealand.":
      "تطير طيور البقويقة مخططة الذيل أكثر من 11,000 كم دون توقف من ألاسكا إلى نيوزيلندا.",
    "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.":
      "يستغرق ضوء الشمس نحو 8 دقائق و20 ثانية ليصل إلى الأرض.",
    "A day on Venus (243 Earth days) is longer than its year (225 Earth days).":
      "اليوم على كوكب الزهرة (243 يومًا أرضيًا) أطول من سنته (225 يومًا أرضيًا).",
    "Water expands by about 9% when it freezes, which is why ice floats.":
      "يتمدد الماء بنحو 9% حين يتجمد، ولهذا يطفو الجليد.",
    "The Moon is moving away from Earth by about 3.8 cm a year, measured by bouncing lasers off mirrors left by Apollo astronauts.":
      "يبتعد القمر عن الأرض بنحو 3.8 سم سنويًا، وقد قيس ذلك بعكس أشعة الليزر عن مرايا تركها رواد فضاء أبولو.",
    "The air is about 78% nitrogen and 21% oxygen.":
      "يتكون الهواء من نحو 78% نيتروجين و21% أكسجين.",
    "Sound travels about 343 metres per second in air, and more than four times faster in water.":
      "ينتقل الصوت في الهواء بنحو 343 مترًا في الثانية، وفي الماء أسرع بأكثر من أربعة أضعاف.",
    "The Hijri year is about 11 days shorter than the solar year, so Ramadan passes through every season in about 33 years.":
      "السنة الهجرية أقصر من السنة الشمسية بنحو 11 يومًا، لذا يمر رمضان بكل الفصول في نحو 33 سنة.",
  },
}
