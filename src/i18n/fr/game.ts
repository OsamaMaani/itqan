import type { Messages } from '../core'

// Level titles and badge names avoid gendered adjectives where a neutral word reads as well
// (memory/10-localization.md, French). 'Muttqin' and 'Itqan' stay: they are the app's identity.
export const levels: Messages['levels'] = [
  'Novice', 'Élève', 'Pas à pas', 'Fidèle', 'Méthodique', 'Cœur à l’ouvrage',
  'Infatigable', 'Tenace', 'Virtuose', 'Maître', 'Muttqin',
]

export const badges: Messages['badges'] = {
  'first-step': { title: 'Premier pas', desc: 'Termine ta première tâche' },
  'tasks-50': { title: 'Ça avance', desc: 'Termine 50 tâches' },
  'tasks-250': { title: 'Pierre après pierre', desc: 'Termine 250 tâches' },
  'streak-7': { title: 'Une semaine tenue', desc: 'Maintiens une habitude 7\u00a0jours d’affilée' },
  'streak-30': { title: 'Un mois entier', desc: 'Maintiens une habitude 30\u00a0jours d’affilée' },
  'streak-100': { title: 'Inébranlable', desc: 'Maintiens une habitude 100\u00a0jours d’affilée' },
  'active-14': { title: 'Sur la lancée', desc: 'Enchaîne 14\u00a0jours actifs' },
  'focus-10h': { title: 'Travail en profondeur', desc: 'Cumule 10\u00a0heures de concentration' },
  'focus-100h': { title: 'Puits de science', desc: 'Cumule 100\u00a0heures de concentration' },
  'focus-90': { title: 'État de flow', desc: 'Termine une session de concentration de 90\u00a0minutes' },
  'goal-1': { title: 'Objectif atteint', desc: 'Atteins un objectif' },
  'goal-5': { title: 'Mission accomplie', desc: 'Atteins 5 objectifs' },
  'review-4': { title: 'L’heure du bilan', desc: 'Rédige 4 bilans de la semaine' },
  early: { title: 'Lève-tôt', desc: 'Termine une tâche avant 7\u00a0h' },
  owl: { title: 'Oiseau de nuit', desc: 'Lance une session de concentration après 22\u00a0h' },
  'level-5': { title: 'En progression', desc: 'Atteins le niveau 5' },
  'level-10': { title: 'Itqan', desc: 'Atteins le niveau 10' },
  'days-30': { title: 'Fidèle au poste', desc: 'Utilise Itqan 30\u00a0jours au total' },
  'memories-10': { title: 'Mémoire vive', desc: 'Enregistre 10 souvenirs' },
  'ideas-25': { title: 'Boîte à idées', desc: 'Note 25 idées' },
  'idea-done': { title: 'De l’idée à la réalité', desc: 'Mène une idée jusqu’au bout' },
  'project-done': { title: 'Livré', desc: 'Termine un projet' },
  'proud-10': { title: 'Fierté', desc: 'Enregistre 10 réussites' },
  'people-10': { title: 'Bonne compagnie', desc: 'Enregistre 10 prises de nouvelles' },
  'people-50': { title: 'Trait d’union', desc: 'Enregistre 50 prises de nouvelles' },
}
