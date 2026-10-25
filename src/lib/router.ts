import { useEffect, useState } from 'react'

export const ROUTES = [
  'today', 'plan', 'habits', 'goals', 'projects', 'focus', 'training', 'ideas', 'notes', 'reminders', 'connections', 'memories',
  'achievements', 'insights', 'review', 'settings',
] as const
export type Route = (typeof ROUTES)[number]

interface Location { route: Route; param: string | null }

function read(): Location {
  const [r, param] = window.location.hash.replace(/^#\/?/, '').split('/')
  return ROUTES.includes(r as Route) ? { route: r as Route, param: param ? decodeURIComponent(param) : null } : { route: 'today', param: null }
}

/** `navigate('projects', id)` → #/projects/<id> (a detail page). */
export function navigate(r: Route, param?: string) {
  window.location.hash = param ? `/${r}/${encodeURIComponent(param)}` : `/${r}`
}

function useLocation(): Location {
  const [loc, setLoc] = useState<Location>(read)
  useEffect(() => {
    const on = () => setLoc(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return loc
}

/** Hash routing: works on GitHub Pages and from file:// with no server rewrites (ADR-003). */
export function useRoute(): Route {
  return useLocation().route
}

/** The id after the route, e.g. the project in #/projects/<id>. */
export function useRouteParam(): string | null {
  return useLocation().param
}
