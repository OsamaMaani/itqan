import type { Messages } from '../core'

export const ideas: Messages['ideas'] = {
  subtitleCount: '{open} en cours · {done} réalisées',
  subtitleEmpty: 'Note chaque idée sur le moment\u202f; décide plus tard quoi en faire.',
  capturePlaceholder: 'J’ai une idée…  (Entrée pour enregistrer)',
  saveIdea: 'Enregistrer l’idée',
  emptyTitle: 'Une boîte à idées vide',
  emptyBody: 'Idées d’entreprise, choses à apprendre, cadeaux, voyages, projets — écris-les ici en une ligne. Plus tard, transforme les bonnes en tâches ou en objectifs.',
  status: { new: 'Nouvelle', exploring: 'À l’étude', doing: 'En cours', done: 'Réalisée', dropped: 'Abandonnée' },
  hint: { new: 'Tout juste notée', exploring: 'En réflexion', doing: 'Avec des actions concrètes', done: 'Devenue réalité' },
  columnCount: '{label} · {n}',
  showDropped: 'Afficher les idées abandonnées · {n}',
  hideDropped: 'Masquer les idées abandonnées · {n}',
  age: {
    now: 'à l’instant',
    minutes: { one: 'il y a {n}\u00a0minute', other: 'il y a {n}\u00a0minutes' },
    hours: { one: 'il y a {n}\u00a0heure', other: 'il y a {n}\u00a0heures' },
    days: { one: 'il y a {n} jour', other: 'il y a {n} jours' },
    months: { one: 'il y a {n} mois', other: 'il y a {n} mois' },
    years: { one: 'il y a {n} an', other: 'il y a {n} ans' },
  },
  tasks: 'Tâches',
  task: 'Tâche',
  projectCreated: 'Projet créé à partir de ton idée',
  moveTo: { exploring: 'Passer à l’étude', doing: 'Passer en cours', done: 'Marquer comme réalisée' },
  madeReal: 'Idée réalisée · +20 XP',
  goalCreated: 'Objectif créé à partir de ton idée',

  toTask: {
    title: 'Transformer en tâche',
    task: 'Tâche',
    taskHint: 'fais-en la toute prochaine action concrète',
    when: 'Quand',
    inbox: 'Boîte de réception',
    addTask: 'Ajouter la tâche',
    addedInbox: 'Tâche ajoutée à la boîte de réception',
    addedToday: 'Tâche ajoutée pour aujourd’hui',
    addedTomorrow: 'Tâche ajoutée pour demain',
  },

  editor: {
    title: 'Idée',
    deleted: 'Idée supprimée',
    notesPlaceholder: 'Pourquoi elle est intéressante, premiers pas, questions en suspens…',
    stage: 'Avancement',
  },
}
