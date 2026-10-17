/**
 * Wisdom for the daily card (ADR-023): sayings from people who studied the mind, the body and
 * living things, classical scholars, and proverbs. Quoted from the work named in `source`; where a
 * line is only traditionally credited to someone, `by` says "attributed to". Famous misattributions
 * ("Let food be thy medicine", "Between stimulus and response there is a space", Darwin on
 * adaptability, most Einstein lines) are deliberately absent — check before adding one.
 */
import type { Saying } from '../lib/daily'

export const SAYINGS: Saying[] = [
  // Psychology
  { field: 'Psychology', by: 'William James', source: 'The Principles of Psychology, 1890', text: 'The great thing, then, in all education, is to make our nervous system our ally instead of our enemy.' },
  { field: 'Psychology', by: 'William James', source: 'The Principles of Psychology, 1890', text: 'Seize the very first possible opportunity to act on every resolution you make, and on every emotional prompting you may experience in the direction of the habits you aspire to gain.' },
  { field: 'Psychology', by: 'William James', source: 'The Principles of Psychology, 1890', text: 'Never suffer an exception to occur till the new habit is securely rooted in your life.' },
  { field: 'Psychology', by: 'William James', source: 'The Principles of Psychology, 1890', text: 'My experience is what I agree to attend to.' },
  { field: 'Psychology', by: 'Viktor Frankl', source: 'Man’s Search for Meaning, 1946', text: 'Everything can be taken from a man but one thing: the last of the human freedoms — to choose one’s attitude in any given set of circumstances, to choose one’s own way.' },
  { field: 'Psychology', by: 'Viktor Frankl', source: 'Man’s Search for Meaning, 1946', text: 'When we are no longer able to change a situation, we are challenged to change ourselves.' },
  { field: 'Psychology', by: 'Friedrich Nietzsche, as quoted by Viktor Frankl', source: 'Twilight of the Idols, 1889', text: 'He who has a why to live for can bear almost any how.' },
  { field: 'Psychology', by: 'Daniel Kahneman', source: 'Thinking, Fast and Slow, 2011', text: 'Nothing in life is as important as you think it is, while you are thinking about it.' },
  { field: 'Psychology', by: 'Daniel Kahneman', source: 'Thinking, Fast and Slow, 2011', text: 'We can be blind to the obvious, and we are also blind to our blindness.' },
  { field: 'Psychology', by: 'Carl Rogers', source: 'On Becoming a Person, 1961', text: 'The curious paradox is that when I accept myself just as I am, then I can change.' },
  { field: 'Psychology', by: 'Mihaly Csikszentmihalyi', source: 'Flow, 1990', text: 'The best moments usually occur when a person’s body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile.' },
  { field: 'Psychology', by: 'Abraham Maslow', source: 'The Psychology of Science, 1966', text: 'I suppose it is tempting, if the only tool you have is a hammer, to treat everything as if it were a nail.' },
  { field: 'Psychology', by: 'Angela Duckworth', source: 'Grit, 2016', text: 'Enthusiasm is common. Endurance is rare.' },
  { field: 'Psychology', by: 'James Clear', source: 'Atomic Habits, 2018', text: 'You do not rise to the level of your goals. You fall to the level of your systems.' },
  { field: 'Psychology', by: 'James Clear', source: 'Atomic Habits, 2018', text: 'Every action you take is a vote for the type of person you wish to become.' },
  { field: 'Psychology', by: 'Robert Waldinger', source: 'TED talk on the Harvard Study of Adult Development, 2015', text: 'Good relationships keep us happier and healthier. Period.' },
  { field: 'Psychology', by: 'Epictetus', source: 'Enchiridion, 5 — a starting point of cognitive therapy', text: 'People are disturbed not by things, but by the views they take of them.' },
  { field: 'Psychology', by: 'Seneca', source: 'Letters to Lucilius, 13', text: 'We suffer more often in imagination than in reality.' },
  { field: 'Psychology', by: 'C. Northcote Parkinson', source: 'The Economist, 1955', text: 'Work expands so as to fill the time available for its completion.' },
  { field: 'Psychology', by: 'Douglas Hofstadter', source: 'Gödel, Escher, Bach, 1979', text: 'Hofstadter’s Law: it always takes longer than you expect, even when you take into account Hofstadter’s Law.' },
  { field: 'Psychology', by: 'Ibn Hazm', source: 'al-Akhlaq wa al-Siyar, c. 1030', text: 'I looked for one aim that all people agree is good and all pursue, and found only one: to drive away worry.' },

  // Learning
  { field: 'Learning', by: 'Ibn Khaldun', source: 'The Muqaddimah, 1377', text: 'A habit is a firmly rooted quality acquired by doing a certain action and repeating it time after time, until the form of that action is firmly fixed.' },
  { field: 'Learning', by: 'Imam al-Shafi‘i', source: 'reported in Hilyat al-Awliya', ar: 'لَيْسَ الْعِلْمُ مَا حُفِظَ، الْعِلْمُ مَا نَفَعَ', text: 'Knowledge is not what is memorised; knowledge is what benefits.' },
  { field: 'Learning', by: 'Abu Hamid al-Ghazali', source: 'Ayyuha al-Walad', text: 'Knowledge without action is madness, and action without knowledge does not come to be.' },
  { field: 'Learning', by: 'attributed to Imam Ahmad ibn Hanbal', ar: 'مَعَ الْمِحْبَرَةِ إِلَى الْمَقْبَرَةِ', text: 'With the inkwell until the grave.' },
  { field: 'Learning', by: 'Confucius', source: 'Analects 2.15', text: 'Learning without thought is labour lost; thought without learning is perilous.' },
  { field: 'Learning', by: 'Confucius', source: 'Analects 1.1', text: 'Is it not a pleasure to learn, and to practise from time to time what you have learned?' },
  { field: 'Learning', by: 'Seneca', source: 'Letters to Lucilius, 7', text: 'While we teach, we learn.' },
  { field: 'Learning', by: 'E. O. Wilson', source: 'Consilience, 1998', text: 'We are drowning in information, while starving for wisdom.' },
  { field: 'Learning', by: 'Aristotle', source: 'Nicomachean Ethics, Book II', text: 'We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.' },
  { field: 'Learning', by: 'Will Durant, summarising Aristotle', source: 'The Story of Philosophy, 1926', text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.' },
  { field: 'Learning', by: 'Kurt Lewin', source: 'Field Theory in Social Science, 1951', text: 'There is nothing so practical as a good theory.' },

  // Neuroscience
  { field: 'Neuroscience', by: 'Santiago Ramón y Cajal', source: 'Advice for a Young Investigator, 1897', text: 'Every man can, if he so desires, become the sculptor of his own brain.' },
  { field: 'Neuroscience', by: 'Carla Shatz, summarising Donald Hebb', source: 'Scientific American, 1992', text: 'Cells that fire together wire together.' },
  { field: 'Neuroscience', by: 'Matthew Walker', source: 'Why We Sleep, 2017', text: 'Sleep is the single most effective thing we can do to reset our brain and body health each day.' },

  // Medicine
  { field: 'Medicine', by: 'Hippocrates', source: 'Aphorisms, 1.1', text: 'Life is short, the art long, opportunity fleeting, experiment treacherous, judgement difficult.' },
  { field: 'Medicine', by: 'Hippocrates', source: 'Epidemics, Book I', text: 'As to diseases, make a habit of two things — to help, or at least to do no harm.' },
  { field: 'Medicine', by: 'Hippocratic Precepts', text: 'Wherever the art of medicine is loved, there is also a love of humanity.' },
  { field: 'Medicine', by: 'Paracelsus', source: 'Third Defence, 1538', text: 'All things are poison, and nothing is without poison; only the dose makes a thing not a poison.' },
  { field: 'Medicine', by: 'traditional medical aphorism, 16th century', text: 'To cure sometimes, to relieve often, to comfort always.' },
  { field: 'Medicine', by: 'attributed to Abu Bakr al-Razi', text: 'If the physician can heal with food rather than medicine, he has succeeded; and if he must use medicine, let it be a simple one rather than a compound.' },
  { field: 'Medicine', by: 'attributed to William Osler', text: 'The good physician treats the disease; the great physician treats the patient who has the disease.' },
  { field: 'Medicine', by: 'attributed to William Osler', text: 'Listen to your patient; he is telling you the diagnosis.' },
  { field: 'Medicine', by: 'attributed to William Osler', text: 'Medicine is a science of uncertainty and an art of probability.' },
  { field: 'Medicine', by: 'Rudolf Virchow', source: '1848', text: 'Medicine is a social science, and politics is nothing else but medicine on a large scale.' },
  { field: 'Medicine', by: 'Florence Nightingale', source: 'Notes on Hospitals, 1863', text: 'It may seem a strange principle to enunciate as the very first requirement in a hospital that it should do the sick no harm.' },
  { field: 'Medicine', by: 'Atul Gawande', source: 'Better, 2007', text: 'Better is possible. It does not take genius. It takes diligence. It takes moral clarity. It takes ingenuity. And above all, it takes a willingness to try.' },
  { field: 'Medicine', by: 'Juvenal', source: 'Satire X', text: 'You should pray for a sound mind in a sound body.' },

  // Biology
  { field: 'Biology', by: 'Claude Bernard', source: '1878', text: 'The constancy of the internal environment is the condition for a free and independent life.' },
  { field: 'Biology', by: 'Rudolf Virchow', source: '1855', text: 'Omnis cellula e cellula — every cell comes from a cell.' },
  { field: 'Biology', by: 'Aristotle', source: 'Politics', text: 'Nature does nothing in vain.' },
  { field: 'Biology', by: 'attributed to Jacques Monod', text: 'Anything found to be true of E. coli must also be true of elephants.' },
  { field: 'Biology', by: 'Rachel Carson', source: '1954', text: 'The more clearly we can focus our attention on the wonders and realities of the universe about us, the less taste we shall have for destruction.' },

  // Science
  { field: 'Science', by: 'Ibn al-Haytham', source: 'Doubts Concerning Ptolemy, c. 1028', text: 'The duty of the one who studies the writings of scientists, if learning the truth is his goal, is to make himself an enemy of all that he reads — and to suspect himself as well, so that he falls into neither prejudice nor leniency.' },
  { field: 'Science', by: 'Louis Pasteur', source: 'Lecture at Lille, 1854', text: 'In the fields of observation, chance favours only the prepared mind.' },
  { field: 'Science', by: 'Richard Feynman', source: 'Cargo Cult Science, 1974', text: 'The first principle is that you must not fool yourself — and you are the easiest person to fool.' },
  { field: 'Science', by: 'Isaac Newton', source: 'Letter to Robert Hooke, 1675', text: 'If I have seen further it is by standing on the shoulders of giants.' },
  { field: 'Science', by: 'attributed to Marie Curie', text: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.' },

  // Character, time and work
  { field: 'Character', by: 'Umar ibn al-Khattab', source: 'reported by at-Tirmidhi', ar: 'حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا', text: 'Hold yourselves to account before you are held to account.' },
  { field: 'Character', by: 'Ibn al-Qayyim', source: 'al-Fawa’id', text: 'Wasting time is worse than death, for wasting time cuts you off from Allah and the Hereafter, while death cuts you off only from this world and its people.' },
  { field: 'Character', by: 'al-Hasan al-Basri', source: 'reported in Hilyat al-Awliya', text: 'O son of Adam, you are nothing but a number of days; whenever a day passes, a part of you is gone.' },
  { field: 'Character', by: 'Ibn al-Jawzi', source: 'Sayd al-Khatir', text: 'A person should know the honour of his time and the worth of his hours, and not waste a single moment of it on anything but what brings him closer to Allah.' },
  { field: 'Character', by: 'Seneca', source: 'On the Shortness of Life', text: 'It is not that we have a short time to live, but that we waste a lot of it.' },
  { field: 'Character', by: 'Seneca', source: 'Letters to Lucilius, 1', text: 'While we are postponing, life speeds by.' },
  { field: 'Character', by: 'Marcus Aurelius', source: 'Meditations, II.5', text: 'Do every act of your life as if it were your last.' },
  { field: 'Character', by: 'Dwight D. Eisenhower', source: 'Speech, 1957', text: 'Plans are worthless, but planning is everything.' },
  { field: 'Character', by: 'Peter Drucker', source: 'Harvard Business Review, 1963', text: 'There is surely nothing quite so useless as doing with great efficiency what should not be done at all.' },
  { field: 'Character', by: 'Benjamin Franklin', source: 'Poor Richard’s Almanack, 1748', text: 'Lost time is never found again.' },
  { field: 'Character', by: 'Laozi', source: 'Tao Te Ching, 64', text: 'A journey of a thousand miles begins beneath one’s feet.' },
  { field: 'Character', by: 'Jean de La Fontaine', source: 'The Hare and the Tortoise', text: 'Rien ne sert de courir ; il faut partir à point. — Running is no use; one must set off on time.' },

  // Proverbs
  { field: 'Proverb', by: 'Arabic proverb', ar: 'الْوَقْتُ كَالسَّيْفِ إِنْ لَمْ تَقْطَعْهُ قَطَعَكَ', text: 'Time is like a sword: if you do not cut it, it cuts you.' },
  { field: 'Proverb', by: 'Arabic proverb', ar: 'مَنْ جَدَّ وَجَدَ، وَمَنْ زَرَعَ حَصَدَ', text: 'Whoever strives, finds; whoever sows, reaps.' },
  { field: 'Proverb', by: 'Arabic proverb', ar: 'مَنْ سَارَ عَلَى الدَّرْبِ وَصَلَ', text: 'Whoever keeps walking the path arrives.' },
  { field: 'Proverb', by: 'Arabic proverb', ar: 'دِرْهَمُ وِقَايَةٍ خَيْرٌ مِنْ قِنْطَارِ عِلَاجٍ', text: 'A dirham of prevention is better than a qintar of cure.' },
  { field: 'Proverb', by: 'Arabic proverb', ar: 'الْعِلْمُ فِي الصِّغَرِ كَالنَّقْشِ عَلَى الْحَجَرِ', text: 'Learning when young is like engraving on stone.' },
  { field: 'Proverb', by: 'Arabic proverb (not a hadith)', ar: 'خَيْرُ الْأُمُورِ أَوْسَطُهَا', text: 'The best of matters is the middle way.' },
  { field: 'Proverb', by: 'French proverb', text: 'Petit à petit, l’oiseau fait son nid. — Little by little, the bird builds its nest.' },
  { field: 'Proverb', by: 'French proverb', text: 'Paris ne s’est pas fait en un jour. — Paris was not built in a day.' },
  { field: 'Proverb', by: 'Japanese proverb', text: 'Fall seven times, stand up eight.' },
  { field: 'Proverb', by: 'Proverb', text: 'The best time to plant a tree was twenty years ago. The second best time is now.' },
  { field: 'Proverb', by: 'Spanish proverb', text: 'Poco a poco se va lejos. — Little by little, one goes far.' },
]
