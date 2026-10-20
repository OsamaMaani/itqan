import type { Messages } from '../core'

export const settings: Messages['settings'] = {
  title: 'Réglages',
  subtitle: 'Adapte Itqan à ta façon de faire.',

  profile: {
    title: 'Profil',
    language: 'Langue de l’interface',
    languageHint: 'Avec la synchronisation activée, ta langue te suit sur tes autres appareils.',
    name: 'Ton prénom',
    namePlaceholder: 'Affiché dans le message d’accueil',
    theme: 'Thème',
    themes: { system: 'Système', light: 'Clair', dark: 'Sombre' },
    weekStartsOn: 'La semaine commence le',
    weightUnit: 'Charges en',
    weightUnitHint: 'changer ne modifie jamais ce que tu as enregistré',
    focusMinutes: 'Concentration (min)',
    breakMinutes: 'Pause (min)',
    sounds: 'Sons',
    showHijri: 'Afficher la date hégirienne',
  },

  daily: {
    title: 'Carte du jour',
    body: 'Un élément de chaque type par jour sur Aujourd’hui, le même sur tous tes appareils. Sur un téléphone, la carte reste repliée sur une ligne jusqu’à ce que tu l’ouvres.',
    verse: 'Verset du Coran',
    hadith: 'Hadith',
    word: 'Mot du jour',
    wisdom: 'Sagesse',
    fact: 'Fait',
    meaning: 'Afficher le sens sous l’arabe',
    wordLanguage: 'Mot du jour — langue',
    level: 'Niveau',
    levelLine: '{level} — {name}',
    chineseHsk: 'Le chinois utilise le HSK\u00a0: {level} ≈ {hsk}',
    levelNames: { A1: 'débutant', A2: 'élémentaire', B1: 'intermédiaire', B2: 'intermédiaire avancé', C1: 'avancé', C2: 'maîtrise' },
  },

  areas: {
    title: 'Domaines de vie',
    add: 'Ajouter un domaine',
    body: 'Les domaines regroupent tes tâches, habitudes, objectifs et temps de concentration — et alimentent le graphique d’équilibre des Statistiques.',
    edit: 'Modifier le domaine',
    editTitle: 'Modifier le domaine',
    newTitle: 'Nouveau domaine',
    namePlaceholder: 'ex. Poésie arabe',
    colour: 'Couleur',
    colours: {
      emerald: 'Émeraude', teal: 'Bleu sarcelle', sky: 'Ciel', indigo: 'Indigo', violet: 'Violet',
      rose: 'Rose', amber: 'Ambre', orange: 'Orange', lime: 'Citron vert', slate: 'Ardoise',
    },
    deleteConfirm: 'Supprimer «\u202f{name}\u202f»\u202f? Ses tâches, habitudes et objectifs sont conservés, simplement sans domaine.',
  },

  counts: {
    tasks: { one: '{n} tâche', other: '{n} tâches' },
    habits: { one: '{n} habitude', other: '{n} habitudes' },
    goals: { one: '{n} objectif', other: '{n} objectifs' },
  },

  data: {
    title: 'Tes données',
    intro: 'Tout est stocké en privé dans ce navigateur — pas de compte, pas de serveur. Cela veut aussi dire que {warning}, alors télécharge une sauvegarde de temps en temps.',
    warning: 'vider les données du navigateur efface tout',
    lastBackup: 'Dernière sauvegarde\u00a0: {date}.',
    noBackup: 'Tu n’as encore fait aucune sauvegarde.',
    download: 'Télécharger une sauvegarde',
    restore: 'Restaurer une sauvegarde',
    deleteAll: 'Tout supprimer',
    backupDownloaded: 'Sauvegarde téléchargée',
    backupRestored: 'Sauvegarde restaurée',
    restoreConfirm: 'Remplacer tout le contenu d’Itqan par cette sauvegarde ({tasks}, {habits}, {goals})\u202f?',
    deleteAllPrompt: 'Cela supprime tout — et, si la synchronisation est activée, sur tes autres appareils aussi. Tape {word} pour confirmer.',
    // No accents, so it types the same on any keyboard.
    deleteWord: 'SUPPRIMER',
    deleted: 'Toutes les données ont été supprimées',
  },

  shortcuts: {
    title: 'Raccourcis',
    commandBar: 'Barre de commandes\u00a0: ajouter des tâches, aller n’importe où',
    newTask: 'Nouvelle tâche',
    goTo: 'Ouvrir {pages}',
    closeDialog: 'Fermer une fenêtre',
    install: 'Pour installer Itqan comme application\u00a0: dans Chrome ou Edge, utilise l’icône d’installation dans la barre d’adresse. Sur un téléphone, utilise {addToHome}. L’application fonctionne ensuite hors ligne.',
    addToHome: 'Ajouter à l’écran d’accueil',
  },
}
