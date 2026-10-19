import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { health: 'Salud', mind: 'Mente', learning: 'Aprendizaje', books: 'Libros', work: 'Trabajo', life: 'Vida' },
  habits: { water: 'Beber agua', read: 'Leer', meditate: 'Meditar', exercise: 'Hacer ejercicio', learn: 'Practicar una habilidad' },
  units: { min: 'min', pages: 'páginas', glasses: 'vasos', books: 'libros', modules: 'módulos' },
  goals: {
    books: { title: 'Leer 12 libros este año', why: 'Un poco cada día acaba siendo mucho.' },
    run: {
      title: 'Correr 5 km',
      why: 'Ganar resistencia, paso a paso.',
      milestones: ['Caminar 30 minutos tres veces por semana', 'Correr 1 km sin parar', 'Correr 3 km', 'Correr 5 km'],
    },
    skill: {
      title: 'Aprender una nueva habilidad',
      why: 'Crecer un poco cada semana.',
      milestones: ['Elegir la habilidad y un buen recurso', 'Practicar durante 10 horas', 'Hacer algo pequeño con ella', 'Compartir o enseñar lo aprendido'],
    },
    course: { title: 'Terminar un curso en línea', why: 'Edítalo para que coincida con tu curso, o bórralo.' },
  },
  tasks: {
    tour: 'Descubre Itqan: pulsa Ctrl+K (o el botón +) para añadir una tarea',
    editGoals: 'Edita los objetivos de ejemplo para que coincidan con tus metas reales, o bórralos',
    focus: 'Prueba una sesión de concentración de 25 minutos',
    walk: 'Dar un paseo de 20 minutos',
  },
}
