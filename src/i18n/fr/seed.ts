import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { quran: 'Coran', french: 'Français', gym: 'Sport', books: 'Livres', courses: 'Cours', life: 'Vie' },
  habits: { quran: 'Réviser le Coran', french: 'Pratiquer le français', read: 'Lire', gym: 'Salle de sport', course: 'Étudier le cours' },
  units: { min: 'min', pages: 'pages', juz: 'juz', modules: 'modules' },
  goals: {
    quran: { title: 'Faire une révision complète du Coran', why: 'Garder ce que j’ai mémorisé solide et proche de mon cœur.' },
    french: {
      title: 'Atteindre le niveau B1 en français',
      why: 'Parler avec assurance, pas seulement réussir un examen.',
      milestones: ['Terminer la révision de la grammaire A2', 'Apprendre 1\u202f000 mots essentiels', 'Faire 5 exposés oraux', 'Réussir un examen blanc B1'],
    },
    book: { title: 'Finir mon livre en cours', why: 'Modifie le titre et le nombre de pages pour qu’ils correspondent au livre.' },
    course: { title: 'Finir mon cours actuel', why: 'Modifie l’objectif pour qu’il corresponde au cours que tu suis.' },
  },
  tasks: {
    tour: 'Découvre Itqan\u00a0: appuie sur Ctrl+K (ou sur le bouton +) pour ajouter une tâche',
    editGoals: 'Modifie les objectifs de départ pour qu’ils correspondent à tes vrais livres, cours et cibles',
    focus: 'Essaie une session de concentration de 25\u00a0minutes',
    gym: 'Séance de sport',
  },
}
