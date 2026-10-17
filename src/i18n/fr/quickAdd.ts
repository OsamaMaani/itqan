import type { Messages } from '../core'

export const quickAdd: Messages['quickAdd'] = {
  placeholder: 'Ajouter une tâche…  essaie «\u202f{example}\u202f»',
  // "demain" is a quick-add word (tomorrow); #livres names the starter area "Livres".
  example: 'Lire 20 pages #livres demain !2',
  areaToken: 'domaine',
  projectToken: 'projet',
  hint: '#{area} · +{project} · !1–3 · {days} · {time} · {estimate}',
}
