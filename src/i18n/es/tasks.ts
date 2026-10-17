import type { Messages } from '../core'

export const tasks: Messages['tasks'] = {
  inbox: 'Bandeja de entrada',
  priority: 'P{n}',
  // "Por la mañana", not "Mañana": next to a date chip, "Mañana" reads as tomorrow.
  timeOfDay: { morning: 'Por la mañana', afternoon: 'Por la tarde', evening: 'Por la noche', anytime: 'A cualquier hora' },
  doing: 'En curso',
  blocked: 'Bloqueada',
  focusOnThis: 'Concentrarse en esto',
  moveToTomorrow: 'Mover a mañana',
  deleted: 'Se eliminó «{title}»',
  editor: {
    editTitle: 'Editar tarea',
    newTitle: 'Nueva tarea',
    saveChanges: 'Guardar cambios',
    addTask: 'Añadir tarea',
    titlePlaceholder: '¿Qué hay que hacer?',
    when: 'Cuándo',
    timeOfDay: 'Momento del día',
    anyTime: 'Cualquiera',
    priority: 'Prioridad',
    estimate: 'Duración estimada',
    minutesHint: 'minutos',
    estimatePlaceholder: 'p. ej., 30',
    goal: 'Hace avanzar un objetivo',
    todo: 'Por hacer',
    steps: 'Pasos',
    addStep: 'Añadir un paso',
    notesPlaceholder: 'Algo que valga la pena recordar',
  },
}
