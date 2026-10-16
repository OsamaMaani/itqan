import type { Entities } from './entities'

/**
 * Per-entity "last writer wins" merge (ADR-016). Every entity carries the time it last changed
 * on the device that changed it; a deletion leaves a tombstone with its time, so a delete on one
 * device beats an older edit on another, and a newer edit beats an older delete.
 */

export interface Stamp {
  /** epoch ms of the last change */
  u: number
  /** 1 = deleted */
  d?: 1
}
export type Meta = Record<string, Stamp>

export interface Side {
  entities: Entities
  meta: Meta
}

export interface MergeResult extends Side {
  /** The merged result differs from the local side → apply it locally. */
  localChanged: boolean
  /** The merged result differs from the remote side → upload it. */
  remoteChanged: boolean
}

/** Entities with no stamp (data from before sync existed) count as very old. */
const ANCIENT: Stamp = { u: 1 }

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

export function merge(local: Side, remote: Side): MergeResult {
  const keys = new Set([...Object.keys(local.entities), ...Object.keys(local.meta), ...Object.keys(remote.entities), ...Object.keys(remote.meta)])
  const entities: Entities = {}
  const meta: Meta = {}
  let localChanged = false
  let remoteChanged = false

  for (const k of keys) {
    const lHas = k in local.entities
    const rHas = k in remote.entities
    const lm = local.meta[k] ?? (lHas ? ANCIENT : undefined)
    const rm = remote.meta[k] ?? (rHas ? ANCIENT : undefined)

    let useLocal: boolean
    if (!rm) useLocal = true
    else if (!lm) useLocal = false
    else if (lm.u !== rm.u) useLocal = lm.u > rm.u
    // Same timestamp, different content: pick deterministically so both devices converge.
    else useLocal = JSON.stringify([lm, local.entities[k]]) >= JSON.stringify([rm, remote.entities[k]])

    const stamp = (useLocal ? lm : rm)!
    const present = !stamp.d && (useLocal ? lHas : rHas)
    const value = useLocal ? local.entities[k] : remote.entities[k]
    meta[k] = stamp
    if (present) entities[k] = value

    if (present !== lHas || (present && !same(value, local.entities[k]))) localChanged = true
    if (present !== rHas || (present && !same(value, remote.entities[k])) || !same(stamp, remote.meta[k])) remoteChanged = true
  }
  return { entities, meta, localChanged, remoteChanged }
}

/**
 * Records local changes: anything added or changed since `prev` gets stamped `now`, anything
 * removed gets a tombstone. Objects are compared by reference — every store action replaces
 * exactly the items it changes (memory/02-conventions.md), so unchanged items keep theirs.
 */
export function stamp(prev: Entities, next: Entities, meta: Meta, now: number): Meta {
  let out: Meta | null = null
  const put = (k: string, s: Stamp) => { (out ??= { ...meta })[k] = s }
  for (const k in next) if (prev[k] !== next[k] || !(k in prev)) put(k, { u: now })
  for (const k in prev) if (!(k in next)) put(k, { u: now, d: 1 })
  return out ?? meta
}

/** Gives every entity that has no stamp yet an ANCIENT one (first run with existing data). */
export function initMeta(e: Entities, meta: Meta): Meta {
  let out: Meta | null = null
  for (const k in e) if (!(k in meta)) (out ??= { ...meta })[k] = ANCIENT
  return out ?? meta
}
