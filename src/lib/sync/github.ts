import { b64, unb64 } from './crypto'

/**
 * Minimal GitHub contents-API client for the sync file (ADR-016). The token is a fine-grained
 * personal access token limited to one private repository with Contents read & write. It is
 * sent only to api.github.com, only in the Authorization header — never in a URL.
 */

export interface RepoRef {
  owner: string
  repo: string
  token: string
}

export const SYNC_PATH = 'itqan-sync.json'
const API = 'https://api.github.com'

export class SyncError extends Error {
  constructor(message: string, public kind: 'auth' | 'access' | 'public' | 'network' | 'conflict' | 'other' = 'other') {
    super(message)
  }
}

function headers(r: RepoRef, extra: Record<string, string> = {}): HeadersInit {
  return {
    Authorization: `Bearer ${r.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
}

async function req(url: string, init: RequestInit): Promise<Response> {
  try {
    // no-store: GitHub allows caching for 60 s, which would hide the other device's changes.
    return await fetch(url, { ...init, cache: 'no-store' })
  } catch {
    throw new SyncError('Offline — will sync when the connection is back.', 'network')
  }
}

const path = (r: RepoRef) => `${API}/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`

/** Confirms the repository exists, is private, and the token can write to it. */
export async function checkRepo(r: RepoRef): Promise<void> {
  const res = await req(path(r), { headers: headers(r) })
  if (res.status === 401) throw new SyncError('GitHub rejected the token. Check that you copied all of it and it has not expired.', 'auth')
  if (res.status === 404 || res.status === 403) {
    throw new SyncError(`Can’t see ${r.owner}/${r.repo}. Check the names, and that the token was given access to this repository.`, 'access')
  }
  if (!res.ok) throw new SyncError(`GitHub answered ${res.status}.`)
  const repo = await res.json()
  if (!repo.private) throw new SyncError(`${r.owner}/${r.repo} is public. Make it private first — your data must not sit in a public repository, even encrypted.`, 'public')
  if (repo.permissions && repo.permissions.push === false) {
    throw new SyncError('The token can read but not write. Give it “Contents: Read and write”.', 'access')
  }
}

export type ReadResult =
  | { status: 'missing' }
  | { status: 'unchanged' }
  | { status: 'ok'; sha: string; etag: string | null; text: string }

function decodeUtf8(b64text: string): string {
  return new TextDecoder().decode(unb64(b64text))
}

export async function readSyncFile(r: RepoRef, etag?: string | null): Promise<ReadResult> {
  const url = `${path(r)}/contents/${SYNC_PATH}`
  const res = await req(url, { headers: headers(r, etag ? { 'If-None-Match': etag } : {}) })
  if (res.status === 304) return { status: 'unchanged' }
  if (res.status === 404) return { status: 'missing' }
  if (res.status === 401) throw new SyncError('GitHub rejected the token — it may have expired. Create a new one and reconnect.', 'auth')
  if (!res.ok) throw new SyncError(`GitHub answered ${res.status} while reading.`)
  const body = await res.json()
  let text: string
  if (body.encoding === 'base64' && body.content) text = decodeUtf8(body.content)
  else {
    // Files over 1 MB come without content; fetch the raw bytes.
    const raw = await req(url, { headers: headers(r, { Accept: 'application/vnd.github.raw+json' }) })
    if (!raw.ok) throw new SyncError(`GitHub answered ${raw.status} while reading.`)
    text = await raw.text()
  }
  return { status: 'ok', sha: body.sha, etag: res.headers.get('ETag'), text }
}

/** Writes the file. Returns the new sha, or throws a 'conflict' SyncError if it changed meanwhile. */
export async function writeSyncFile(r: RepoRef, text: string, sha: string | null): Promise<string> {
  const res = await req(`${path(r)}/contents/${SYNC_PATH}`, {
    method: 'PUT',
    headers: headers(r, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message: `Itqan sync ${new Date().toISOString()}`,
      content: b64(new TextEncoder().encode(text)),
      ...(sha ? { sha } : {}),
    }),
  })
  if (res.status === 409 || res.status === 422) throw new SyncError('Changed on another device meanwhile.', 'conflict')
  if (res.status === 401) throw new SyncError('GitHub rejected the token — it may have expired. Create a new one and reconnect.', 'auth')
  if (res.status === 403 || res.status === 404) throw new SyncError('The token can’t write to the repository. Give it “Contents: Read and write”.', 'access')
  if (!res.ok) throw new SyncError(`GitHub answered ${res.status} while saving.`)
  return (await res.json()).content.sha
}
