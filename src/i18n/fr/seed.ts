import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { health: 'Santé', mind: 'Esprit', learning: 'Apprentissage', books: 'Livres', work: 'Travail', life: 'Vie' },
  habits: { water: 'Boire de l’eau', read: 'Lire', meditate: 'Méditer', exercise: 'Faire du sport', learn: 'Pratiquer une compétence' },
  units: { min: 'min', pages: 'pages', glasses: 'verres', books: 'livres', modules: 'modules' },
  goals: {
    books: { title: 'Lire 12 livres cette année', why: 'Un peu chaque jour finit par faire beaucoup.' },
    run: {
      title: 'Courir 5 km',
      why: 'Gagner en endurance, un petit pas à la fois.',
      milestones: ['Marcher 30 minutes trois fois par semaine', 'Courir 1 km sans s’arrêter', 'Courir 3 km', 'Courir 5 km'],
    },
    skill: {
      title: 'Apprendre une nouvelle compétence',
      why: 'Progresser un peu chaque semaine.',
      milestones: ['Choisir la compétence et une bonne ressource', 'S’exercer pendant 10 heures', 'Réaliser un petit projet avec', 'Partager ou enseigner ce qu’on a appris'],
    },
    course: { title: 'Terminer un cours en ligne', why: 'Modifie-le pour qu’il corresponde à ton cours, ou supprime-le.' },
  },
  tasks: {
    tour: 'Découvre Itqan : appuie sur Ctrl+K (ou sur le bouton +) pour ajouter une tâche',
    editGoals: 'Modifie les objectifs d’exemple pour qu’ils correspondent à tes vraies cibles, ou supprime-les',
    focus: 'Essaie une session de concentration de 25 minutes',
    walk: 'Faire une marche de 20 minutes',
  },
}
