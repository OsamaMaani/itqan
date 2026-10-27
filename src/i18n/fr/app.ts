import type { Messages } from '../core'

export const app: Messages['app'] = {
  levelUp: 'Niveau {n} — {title}\u202f!',
  backupDue: 'Ta dernière sauvegarde remonte à 2\u00a0semaines',
  backupNever: 'Tes données n’existent que dans ce navigateur',
  backUp: 'Sauvegarder',
  whatsNew: {
    title: 'Nouveautés d’Itqan',
    history: 'Toutes les mises à jour',
    gotIt: 'Compris',
    settingsTitle: 'Nouveautés',
    settingsBody: 'Toutes les mises à jour d’Itqan, les plus récentes d’abord.',
    seeAll: 'Voir toutes les mises à jour',
  },
}
