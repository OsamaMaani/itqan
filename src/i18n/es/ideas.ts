import type { Messages } from '../core'

export const ideas: Messages['ideas'] = {
  // The counts are not plurals in the source: "Abiertas: 1" reads right for any number.
  subtitleCount: 'Abiertas: {open} · Hechas realidad: {done}',
  subtitleEmpty: 'Atrapa cada idea ahora; decide qué hacer con ella después.',
  capturePlaceholder: 'Tengo una idea…  (Enter para guardar)',
  saveIdea: 'Guardar idea',
  emptyTitle: 'Una caja de ideas vacía',
  emptyBody: 'Ideas de negocio, cosas que aprender, regalos, viajes, proyectos: escríbelas aquí en una línea. Después, convierte las buenas en tareas u objetivos.',
  status: { new: 'Nueva', exploring: 'En exploración', doing: 'En marcha', done: 'Hecha', dropped: 'Descartada' },
  hint: { new: 'Recién anotada', exploring: 'Dándole vueltas', doing: 'Con próximos pasos reales', done: 'Hecha realidad' },
  columnCount: '{label} · {n}',
  showDropped: 'Mostrar ideas descartadas · {n}',
  hideDropped: 'Ocultar ideas descartadas · {n}',
  age: {
    now: 'hace menos de un minuto',
    minutes: { one: 'hace {n} minuto', other: 'hace {n} minutos' },
    hours: { one: 'hace {n} hora', other: 'hace {n} horas' },
    days: { one: 'hace {n} día', other: 'hace {n} días' },
    months: { one: 'hace {n} mes', other: 'hace {n} meses' },
    years: { one: 'hace {n} año', other: 'hace {n} años' },
  },
  tasks: 'Tareas',
  task: 'Tarea',
  projectCreated: 'Proyecto creado a partir de tu idea',
  moveTo: { exploring: 'Pasar a explorarla', doing: 'Ponerla en marcha', done: 'Marcar como hecha realidad' },
  madeReal: 'Idea hecha realidad · +20 XP',
  goalCreated: 'Objetivo creado a partir de tu idea',

  toTask: {
    title: 'Convertir en tarea',
    task: 'Tarea',
    taskHint: 'que sea el siguiente paso físico y concreto',
    when: 'Cuándo',
    inbox: 'Bandeja de entrada',
    addTask: 'Añadir tarea',
    addedInbox: 'Tarea añadida a la Bandeja de entrada',
    addedToday: 'Tarea añadida para hoy',
    addedTomorrow: 'Tarea añadida para mañana',
  },

  editor: {
    title: 'Idea',
    deleted: 'Idea eliminada',
    notesPlaceholder: 'Por qué es interesante, primeros pasos, preguntas abiertas…',
    stage: 'Etapa',
  },
}
