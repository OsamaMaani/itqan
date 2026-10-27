import { decodeBase64, MAX_REQUEST_BYTES, originAllowed, parsePushes } from './guard'

/**
 * Itqan's push relay (ADR-037): a Cloudflare Worker that forwards Web Push requests the app has
 * already signed and encrypted, for installs that have no desktop helper (the hosted app in any
 * browser). A web page cannot POST to Apple's or Google's push service itself — they send no CORS
 * headers — so this does it, and nothing else: no storage, no logs of content, no state.
 *
 * Configuration: ALLOWED_ORIGINS, a comma-separated list of exact origins (the GitHub Pages
 * address), set at deploy time by relay/deploy.sh.
 */

interface Env {
  ALLOWED_ORIGINS?: string
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin')
    if (!originAllowed(origin, env.ALLOWED_ORIGINS ?? '')) return new Response('forbidden', { status: 403 })
    const cors = corsHeaders(origin!)
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/push') return reply(404, { error: 'not found' })

    const text = await req.text()
    if (text.length > MAX_REQUEST_BYTES) return reply(413, { error: 'too large' })
    let json: unknown
    try { json = JSON.parse(text) } catch { return reply(400, { error: 'bad json' }) }
    const pushes = parsePushes(json)
    if (!pushes) return reply(400, { error: 'rejected' })

    // A push service never redirects; following one could send the request somewhere else.
    const results = await Promise.all(pushes.map(async (p) => {
      try {
        const res = await fetch(p.endpoint, { method: 'POST', headers: p.headers, body: decodeBase64(p.body), redirect: 'manual' })
        return res.status
      } catch {
        return 0
      }
    }))
    return reply(200, { results })
  },
}
