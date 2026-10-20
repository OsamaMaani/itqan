import type { Messages } from '../core'

export const palette: Messages['palette'] = {
  placeholder: 'Saisis une tâche («\u202f{example}\u202f») ou une commande…',
  // "ce soir" is a quick-add word (tonight); #sport names the starter area "Sport".
  example: 'Marcher ce soir #santé',
  escKey: 'Échap',
  saveIdea: 'Enregistrer l’idée «\u202f{text}\u202f»',
  addTask: 'Ajouter la tâche «\u202f{title}\u202f»',
  ideaSaved: 'Idée enregistrée',
  taskAdded: 'Tâche ajoutée\u00a0: «\u202f{title}\u202f»',
  goTo: 'Ouvrir {page}',
  startFocus: 'Lancer une session de concentration de {n}\u00a0minutes',
  focusLabel: 'Concentration',
  resumeWorkout: 'Reprendre la séance : {name}',
  startRoutine: 'Commencer la séance : {name}',
  startWorkout: 'Commencer une séance vide',
  newReminder: 'Nouveau rappel',
  recordAchievement: 'Enregistrer une réussite',
  writeMemory: 'Écrire un souvenir',
  toggleDark: 'Activer ou désactiver le mode sombre',
  downloadBackup: 'Télécharger une sauvegarde',
  hint: '{idea} enregistre une idée · {area} · {project} · priorité {priority} · {days} · {time} · {estimate}',
  ideaToken: '{word}\u00a0: …',
}
