import type { Messages } from '../core'

export const seed: Messages['seed'] = {
  areas: { quran: 'Corán', french: 'Francés', gym: 'Gimnasio', books: 'Libros', courses: 'Cursos', life: 'Vida' },
  habits: { quran: 'Repasar el Corán', french: 'Practicar francés', read: 'Leer', gym: 'Gimnasio', course: 'Estudiar el curso' },
  units: { min: 'min', pages: 'páginas', juz: 'juz', modules: 'módulos' },
  goals: {
    quran: { title: 'Hacer un repaso completo del Corán', why: 'Mantener firme lo que he memorizado, y cerca de mi corazón.' },
    french: {
      title: 'Alcanzar el nivel B1 de francés',
      why: 'Hablar con seguridad, no solo aprobar un examen.',
      milestones: ['Terminar el repaso de gramática A2', 'Aprender 1000 palabras básicas', 'Hacer 5 presentaciones orales', 'Aprobar un examen de prueba B1'],
    },
    book: { title: 'Terminar mi libro actual', why: 'Edita el título y el número de páginas para que coincidan con el libro.' },
    course: { title: 'Terminar mi curso actual', why: 'Edítalo para que coincida con el curso que estás estudiando.' },
  },
  tasks: {
    tour: 'Descubre Itqan: pulsa Ctrl+K (o el botón +) para añadir una tarea',
    editGoals: 'Edita los objetivos de inicio para que coincidan con tus libros, cursos y metas reales',
    focus: 'Prueba una sesión de concentración de 25 minutos',
    gym: 'Sesión de gimnasio',
  },
}
