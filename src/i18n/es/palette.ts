import type { Messages } from '../core'

export const palette: Messages['palette'] = {
  placeholder: 'Escribe una tarea («{example}») o un comando…',
  // "esta noche" is a quick-add word (tonight); #gimnasio names the starter area "Gimnasio".
  example: 'Caminar esta noche #salud',
  escKey: 'Esc',
  saveIdea: 'Guardar la idea «{text}»',
  addTask: 'Añadir la tarea «{title}»',
  ideaSaved: 'Idea guardada',
  saveNote: 'Guardar la nota «{text}»',
  noteSaved: 'Nota guardada',
  taskAdded: 'Tarea añadida: «{title}»',
  goTo: 'Ir a {page}',
  startFocus: 'Empezar una sesión de concentración de {n} minutos',
  focusLabel: 'Concentración',
  resumeWorkout: 'Reanudar entrenamiento: {name}',
  startRoutine: 'Empezar entrenamiento: {name}',
  startWorkout: 'Empezar un entrenamiento vacío',
  newReminder: 'Nuevo recordatorio',
  recordAchievement: 'Registrar un logro',
  writeMemory: 'Escribir un recuerdo',
  newNote: 'Nueva nota',
  toggleDark: 'Activar o desactivar el modo oscuro',
  downloadBackup: 'Descargar una copia de seguridad',
  hint: '{idea} guarda una idea · {note} guarda una nota · {area} · {project} · prioridad {priority} · {days} · {time} · {estimate}',
  ideaToken: '{word}: …',
}
