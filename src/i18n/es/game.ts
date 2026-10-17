import type { Messages } from '../core'

// Level titles are qualities, not adjectives, so they read the same for anyone
// (memory/10-localization.md, Spanish). 'Muttqin' and 'Itqan' stay: they are the app's identity.
export const levels: Messages['levels'] = [
  'Inicio', 'Aprendizaje', 'Firmeza', 'Compromiso', 'Disciplina', 'Enfoque',
  'Constancia', 'Resiliencia', 'Pericia', 'Maestría', 'Muttqin',
]

export const badges: Messages['badges'] = {
  'first-step': { title: 'Primer paso', desc: 'Completa tu primera tarea' },
  'tasks-50': { title: 'Manos a la obra', desc: 'Completa 50 tareas' },
  'tasks-250': { title: 'Piedra a piedra', desc: 'Completa 250 tareas' },
  'streak-7': { title: 'Una semana firme', desc: 'Mantén un hábito 7 días seguidos' },
  'streak-30': { title: 'Un mes completo', desc: 'Mantén un hábito 30 días seguidos' },
  'streak-100': { title: 'Inquebrantable', desc: 'Mantén un hábito 100 días seguidos' },
  'active-14': { title: 'Impulso', desc: 'Suma 14 días activos seguidos' },
  'focus-10h': { title: 'Trabajo profundo', desc: 'Registra 10 horas de concentración' },
  'focus-100h': { title: 'Pozo de ciencia', desc: 'Registra 100 horas de concentración' },
  'focus-90': { title: 'Estado de flujo', desc: 'Termina una sesión de concentración de 90 minutos' },
  'goal-1': { title: 'Objetivo cumplido', desc: 'Alcanza un objetivo' },
  'goal-5': { title: 'Misión cumplida', desc: 'Alcanza 5 objetivos' },
  'review-4': { title: 'Mirada atrás', desc: 'Escribe 4 revisiones semanales' },
  early: { title: 'Al alba', desc: 'Termina una tarea antes de las 7:00' },
  owl: { title: 'Ave nocturna', desc: 'Empieza una sesión de concentración después de las 22:00' },
  'level-5': { title: 'En ascenso', desc: 'Alcanza el nivel 5' },
  'level-10': { title: 'Itqan', desc: 'Alcanza el nivel 10' },
  'days-30': { title: 'Fiel a la cita', desc: 'Usa Itqan durante 30 días' },
  'memories-10': { title: 'Cuentacuentos', desc: 'Guarda 10 recuerdos' },
  'ideas-25': { title: 'Fábrica de ideas', desc: 'Anota 25 ideas' },
  'idea-done': { title: 'De la idea a la realidad', desc: 'Lleva una idea hasta el final' },
  'project-done': { title: 'Proyecto entregado', desc: 'Termina un proyecto' },
  'proud-10': { title: 'Orgullo', desc: 'Registra 10 logros' },
  'people-10': { title: 'Buena compañía', desc: 'Registra 10 contactos con tu gente' },
  'people-50': { title: 'Lazos que unen', desc: 'Registra 50 contactos con tu gente' },
}
