import type { Messages } from '../core'

export const app: Messages['app'] = {
  levelUp: '¡Nivel {n}: {title}!',
  backupDue: 'Han pasado 2 semanas desde tu última copia de seguridad',
  backupNever: 'Tus datos solo están en este navegador',
  backUp: 'Hacer copia',
  whatsNew: {
    title: 'Novedades de Itqan',
    history: 'Todas las actualizaciones',
    gotIt: 'Entendido',
    settingsTitle: 'Novedades',
    settingsBody: 'Todas las actualizaciones de Itqan, las más recientes primero.',
    seeAll: 'Ver todas las actualizaciones',
  },
}
