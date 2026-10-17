import type { Messages } from '../core'

export const quickAdd: Messages['quickAdd'] = {
  placeholder: 'Añadir una tarea…  prueba «{example}»',
  // "mañana" is a quick-add word (tomorrow); #libros names the starter area "Libros".
  example: 'Leer 20 páginas #libros mañana !2',
  areaToken: 'área',
  projectToken: 'proyecto',
  hint: '#{area} · +{project} · !1–3 · {days} · {time} · {estimate}',
}
