import { useEffect, useState } from 'react'

export const ROUTES = ['today', 'plan', 'habits', 'goals', 'focus', 'ideas', 'reminders', 'memories', 'insights', 'review', 'settings'] as const
export type Route = (typeof ROUTES)[number]

function read(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(h) ? h : 'today'
}

export function navigate(r: Route) {
  window.location.hash = `/${r}`
}

/** Hash routing: works on GitHub Pages with no server rewrites (ADR-003). */
export function useRoute(): Route {
  const [r, setR] = useState<Route>(read)
  useEffect(() => {
    const on = () => setR(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
