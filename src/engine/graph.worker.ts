// src/engine/graph.worker.ts
// d3-force 2D layout worker. No React, no fetch, no app imports.
//
// Latest-wins: the bridge increments revision on each CMD.SET_GRAPH and discards
// LAYOUT_DONE messages whose revision doesn't match the last-sent revision.
// Since the simulation runs synchronously, we also check revision on completion
// and skip the postMessage if a newer job has already been received.

import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'

// ---------------------------------------------------------------------------
// Message types (internal to the engine layer, never exposed to app code)
// ---------------------------------------------------------------------------

export type WorkerInMessage =
  | { kind: 'LAYOUT'; revision: number; nodeCount: number; edgeCount: number; edgeFrom: Uint32Array; edgeTo: Uint32Array }

export type WorkerOutMessage =
  | { kind: 'LAYOUT_DONE'; revision: number; positions: Float32Array }

// ---------------------------------------------------------------------------
// Simulation constants
// ---------------------------------------------------------------------------

const TICKS         = 300
const LINK_DISTANCE = 0.25
const LINK_STRENGTH = 0.4
const CHARGE        = -45
const CENTER_FORCE  = 0.6
const COLLIDE_R     = 0.04

// ---------------------------------------------------------------------------
// Revision tracking — ensures stale results are never posted
// ---------------------------------------------------------------------------

let _latestRevision = -1

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data
  if (msg.kind !== 'LAYOUT') return

  _latestRevision = msg.revision
  const { revision, nodeCount, edgeCount, edgeFrom, edgeTo } = msg

  if (nodeCount <= 0) {
    if (revision === _latestRevision) {
      self.postMessage({ kind: 'LAYOUT_DONE', revision, positions: new Float32Array(0) } satisfies WorkerOutMessage)
    }
    return
  }

  // Initial positions on a unit circle — reduces d3's first-tick overlap clumping.
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (i / nodeCount) * 2 * Math.PI
    return { id: String(i), x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 }
  })

  // Build links, filtering out-of-bounds indices defensively.
  const links: { source: string; target: string }[] = []
  for (let i = 0; i < edgeCount; i++) {
    const src = edgeFrom[i]
    const tgt = edgeTo[i]
    if (src !== undefined && tgt !== undefined && src < nodeCount && tgt < nodeCount) {
      links.push({ source: String(src), target: String(tgt) })
    }
  }

  // Build simulation — stop() prevents auto-ticking, we drive ticks manually.
  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink<typeof nodes[number], typeof links[number]>(links)
        .id(d => d.id)
        .distance(LINK_DISTANCE)
        .strength(LINK_STRENGTH),
    )
    .force('charge', forceManyBody().strength(CHARGE))
    .force('center', forceCenter(0, 0).strength(CENTER_FORCE))
    .force('collide', forceCollide<typeof nodes[number]>(COLLIDE_R))
    .stop()

  sim.tick(TICKS)

  // Discard if a newer job arrived while we were running.
  if (revision !== _latestRevision) return

  // Pack positions into a transferable Float32Array [x0,y0, x1,y1, ...].
  const positions = new Float32Array(nodeCount * 2)
  for (let i = 0; i < nodeCount; i++) {
    positions[i * 2]     = nodes[i].x
    positions[i * 2 + 1] = nodes[i].y
  }

  const out: WorkerOutMessage = { kind: 'LAYOUT_DONE', revision, positions }
  // Transfer the buffer to avoid a copy on postMessage.
  self.postMessage(out, { transfer: [positions.buffer] })
}
