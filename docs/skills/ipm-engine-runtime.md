# ipm-engine-runtime — Visual Engine Runtime

**Role:** Lifecycle, workers, GPU discipline, transitions for visual engines.
**When to read:** Implementing or debugging engines, designing transitions, diagnosing leaks/jank/race conditions, worker orchestration.
**Priority:** Obeys `ipm-v4-core-architect`. Cannot redefine architecture; can optimize implementation.

---

## RUNTIME MODEL

- Engines are **processes**, not components.
- Each engine owns its lifecycle.
- `EngineManager` coordinates `mount → warm → crossfade → dispose`.
- Workers use **latest-wins** backpressure with monotonic revision numbers per job kind.
- Cross-engine transitions use DOM composited crossfade (CSS `opacity` on two sibling divs).
- Cleanup must aggressively release RAFs, listeners, workers, buffers, textures, and WebGL contexts.

---

## THE VISUAL ENGINE CONTRACT

```ts
interface VisualEngine<TInput> {
  init(container: HTMLElement): Promise<void> | void
  mount(input: TInput): Promise<void> | void
  update(input: TInput): void
  resize(bounds: { width: number; height: number }): void
  pause(): void
  resume(): void
  snapshot?(): HTMLCanvasElement | OffscreenCanvas | null
  destroy(): void
  getCapabilities(): EngineCapabilities
}

interface EngineCapabilities {
  supportsSnapshot: boolean
  supportsCrossfade: boolean
  supportsCameraIntent: boolean
  supportsHitTesting: boolean
  supportsTimelineScrubbing: boolean
}
```

---

## ENGINE FACTORY (typed overloads)

```ts
function createEngine(type: 'graph'): GraphEngine
function createEngine(type: 'globe'): GlobeEngine
function createEngine(type: EngineType): GraphEngine | GlobeEngine
```

---

## ENGINE INPUT (discriminated union, TypedArrays only)

```ts
type EngineSwitchPayload =
  | { engineType: 'graph'; input: GraphEngineInput }
  | { engineType: 'globe'; input: GlobeEngineInput }
```

All inputs use `Float32Array` / `Uint32Array`. No nested objects. No JSON. No `any`.

### Example: GlobeEngineInput
```ts
interface GlobeEngineInput {
  pointCount: number
  arcCount: number
  pointIds: string[]
  arcIds: string[]
  pointLatLng: Float32Array      // [lat,lng,lat,lng,...]
  pointSizes: Float32Array
  pointColors: Float32Array      // [r,g,b,...]
  arcCoords: Float32Array        // [fromLat,fromLng,toLat,toLng,...]
  arcIntensity: Float32Array
  arcColors: Float32Array
  selectedPointIndex: number
  highlightedArcIndex: number
  camera: { targetLat?: number; targetLng?: number; zoomLevel?: number }
  degraded?: boolean
}
```

---

## ENGINE MANAGER STATES

Sprint 1 scope:
```
idle → initializing → active → transitioning → crossfading → active
                 ↓
              failed   [no retry/degraded yet]
```

Sprint 2 adds: `failed → retry` with exponential backoff, `failed → degraded` for low-VRAM fallback.

---

## WORKER BACKPRESSURE (latest-wins per kind)

Not in sprint 1 (no worker-using engines yet). Sprint 2:

```ts
type WorkerJobKind = 'layout' | 'propagation' | 'clustering' | 'labels' | 'visible-set'

interface WorkerJob<TInput> {
  jobId: number
  kind: WorkerJobKind
  revision: number
  input: TInput
}

interface WorkerResult<TOutput> {
  jobId: number
  kind: WorkerJobKind
  revision: number
  output: TOutput
}
```

Rules:
- Each engine maintains `latestRevisionByKind: Map<WorkerJobKind, number>`.
- On send: increment revision for that kind.
- On receive: if `result.revision < latestRevisionByKind[kind]`, **discard**.
- On `destroy()`: abort all in-flight jobs via `AbortController`.
- On mode switch: invalidate all jobs of the outgoing engine.

---

## TRANSITION PROTOCOL

1. `EngineManager` receives `ENGINE.SWITCH`.
2. Current engine: `pauseActiveEngine`.
3. Optional `snapshot()` captured for visual continuity.
4. New engine created in the transitional slot (`engine-b` div).
5. `init()` → `mount(input)` awaited.
6. **Warmup frame:** wait one `requestAnimationFrame` to guarantee new engine rendered at least once.
7. DOM crossfade: `engine-a.opacity = 0`, `engine-b.opacity = 1`, 300ms transition.
8. After 300ms: `destroy()` on old engine, promote `engine-b` → `engine-a`.

---

## DESTROY DISCIPLINE (critical)

Every `destroy()` MUST:

```ts
destroy() {
  // 1. Stop the loop
  if (this.frameId) cancelAnimationFrame(this.frameId)
  this.frameId = null

  // 2. Kill workers
  this.worker?.terminate()
  this.abortController?.abort()

  // 3. Dispose GPU resources
  this.mesh.geometry.dispose()
  (this.mesh.material as THREE.Material).dispose()
  this.renderer.dispose()
  this.renderer.forceContextLoss()   // CRITICAL — releases WebGL context

  // 4. Remove DOM
  this.canvas.remove()

  // 5. Null references for GC
  this.scene = null as any
  this.renderer = null as any
}
```

**Skipping `forceContextLoss()` is the #1 cause** of "Too many active WebGL contexts" crashes after 10-20 engine switches.

---

## GLOBE ENGINE (V1 sprint 1)

DeckGL vanilla, NOT the `<DeckGL />` React wrapper.

```ts
export class GlobeEngine implements VisualEngine<GlobeEngineInput> {
  private deck!: Deck

  init(container: HTMLElement) {
    this.deck = new Deck({
      parent: container,
      views: new _GlobeView({ resolution: 1 }),
      initialViewState: { longitude: 0, latitude: 20, zoom: 0 },
      controller: true,
      layers: []
    })
  }

  mount(input: GlobeEngineInput) {
    this.deck.setProps({ layers: this.buildLayers(input) })
  }

  update(input: GlobeEngineInput) {
    this.deck.setProps({ layers: this.buildLayers(input) })
  }

  destroy() {
    this.deck.finalize()
  }

  // buildLayers, pause, resume, resize, getCapabilities...
}
```

---

## TRANSITION STRESS HARNESS (sprint 2 validation)

Not in sprint 1 — only one engine. When implementing sprint 2:

- Spam 50-100 mode switches at 100-200ms.
- Chrome Performance → GPU Memory: "mountain returning to base", not staircase up.
- WebGL context count: ≤2 (active + transitional max).
- 60 FPS sustained during crossfade; 40 FPS minimum floor.
- No orphan workers (`getEventListeners(window)` clean).
- Memory snapshot every 2s for 2 min: heap growth must flatten.

---

## NON-NEGOTIABLE RUNTIME RULES

- Only one ACTIVE engine, optional one transitional.
- Every heavy worker job supports `AbortSignal`.
- `WorkerResult` older than `latestRevision` is discarded.
- Transitions use DOM compositor (CSS opacity), never React state.
- `destroy()` cancels RAF, kills workers, detaches listeners, frees GPU, calls `forceContextLoss()`.
- No engine fetches from APIs.
- No engine owns hidden semantic state required for reconstruction.
- **No R3F.** GraphEngine uses Three.js vanilla. Decision: `docs/engine-r3f-decision.md`.
- GlobeEngine uses DeckGL vanilla (`new Deck()`), not React wrapper.

---

## DIAGNOSTIC PROTOCOL

Debugging a runtime issue:

1. **Lifecycle stage at risk** — which machine state?
2. **Failure mode observed** — leak, crash, jank, stale result, orphan worker?
3. **Root cause hypothesis** — what ownership boundary was crossed?
4. **Fix** — minimal change respecting architecture
5. **Validation test** — how to prove the fix holds under stress (FPS/VRAM/context count)

Before proposing code, mentally simulate the lifecycle transition. Prefer measurable validation ("60fps over 50 switches") over "should work now".
