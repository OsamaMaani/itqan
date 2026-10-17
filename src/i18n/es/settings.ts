import type { Messages } from '../core'

export const settings: Messages['settings'] = {
  title: 'Ajustes',
  subtitle: 'Haz que Itqan sea tuyo.',

  profile: {
    title: 'Perfil',
    language: 'Idioma de la interfaz',
    languageHint: 'Con la sincronización activada, tu idioma te sigue a tus otros dispositivos.',
    name: 'Tu nombre',
    namePlaceholder: 'Aparece en el saludo',
    theme: 'Tema',
    themes: { system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
    weekStartsOn: 'La semana empieza el',
    focusMinutes: 'Concentración (min)',
    breakMinutes: 'Descanso (min)',
    sounds: 'Sonidos',
    showHijri: 'Mostrar la fecha de la Hégira',
  },

  daily: {
    title: 'Tarjeta del día',
    body: 'Una de cada tipo al día en Hoy, la misma en todos tus dispositivos. En el teléfono se queda plegada en una línea hasta que la abres.',
    verse: 'Versículo del Corán',
    hadith: 'Hadiz',
    word: 'Palabra del día',
    wisdom: 'Sabiduría',
    fact: 'Dato',
    meaning: 'Mostrar el significado bajo el árabe',
    wordLanguage: 'Palabra del día: idioma',
    level: 'Nivel',
    levelLine: '{level} — {name}',
    chineseHsk: 'El chino usa el HSK: {level} ≈ {hsk}',
    levelNames: { A1: 'principiante', A2: 'elemental', B1: 'intermedio', B2: 'intermedio alto', C1: 'avanzado', C2: 'maestría' },
  },

  areas: {
    title: 'Áreas de la vida',
    add: 'Añadir área',
    body: 'Las áreas agrupan tus tareas, hábitos, objetivos y tiempo de concentración, y alimentan el gráfico de equilibrio de Estadísticas.',
    edit: 'Editar área',
    editTitle: 'Editar área',
    newTitle: 'Nueva área',
    namePlaceholder: 'p. ej., Poesía árabe',
    colour: 'Color',
    colours: {
      emerald: 'Esmeralda', teal: 'Verde azulado', sky: 'Cielo', indigo: 'Índigo', violet: 'Violeta',
      rose: 'Rosa', amber: 'Ámbar', orange: 'Naranja', lime: 'Lima', slate: 'Pizarra',
    },
    deleteConfirm: '¿Eliminar «{name}»? Sus tareas, hábitos y objetivos se conservan, pero sin área.',
  },

  counts: {
    tasks: { one: '{n} tarea', other: '{n} tareas' },
    habits: { one: '{n} hábito', other: '{n} hábitos' },
    goals: { one: '{n} objetivo', other: '{n} objetivos' },
  },

  data: {
    title: 'Tus datos',
    intro: 'Todo se guarda de forma privada en este navegador: sin cuenta, sin servidor. Eso también significa que {warning}, así que descarga una copia de seguridad de vez en cuando.',
    warning: 'borrar los datos del navegador lo elimina todo',
    lastBackup: 'Última copia de seguridad: {date}.',
    noBackup: 'Aún no has hecho ninguna copia de seguridad.',
    download: 'Descargar copia de seguridad',
    restore: 'Restaurar una copia de seguridad',
    deleteAll: 'Borrar todo',
    backupDownloaded: 'Copia de seguridad descargada',
    backupRestored: 'Copia de seguridad restaurada',
    restoreConfirm: '¿Sustituir todo lo que hay en Itqan por esta copia de seguridad ({tasks}, {habits}, {goals})?',
    deleteAllPrompt: 'Esto lo borra todo y, si la sincronización está activada, también en tus otros dispositivos. Escribe {word} para confirmar.',
    // No accents or ñ, so it types the same on any keyboard.
    deleteWord: 'BORRAR',
    deleted: 'Se han borrado todos los datos',
  },

  shortcuts: {
    title: 'Atajos',
    commandBar: 'Barra de comandos: añade tareas, ve a cualquier parte',
    newTask: 'Nueva tarea',
    goTo: 'Ir a {pages}',
    closeDialog: 'Cerrar un cuadro de diálogo',
    install: 'Instala Itqan como app: en Chrome o Edge, usa el icono de instalación de la barra de direcciones. En el teléfono, usa {addToHome}. Después funciona sin conexión.',
    addToHome: 'Añadir a pantalla de inicio',
  },
}
