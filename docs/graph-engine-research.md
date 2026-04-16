# Graph Engine Research — Archive for Sprint 2

**Status:** NOT IMPLEMENTED in sprint 1. Reference only.
**When to use:** Sprint 2, when implementing `GraphEngine` for PowerMap, ego-graph, or scenario-cascade.
**Source:** 32+ documents from GPT, Gemini, Google AI Studio, Copilot, NotebookLM, Perplexity during architecture phase.

## Convergence points (5 AIs unanimous)
1. URL is single navigable source of truth
2. React is layout; engines are processes outside React
3. Pipeline: `services → mappers → ViewModels → EngineBridge → EngineInput`
4. Only one ACTIVE engine + optional one transitional
5. Workers: latest-wins per kind + AbortSignal
6. `destroy()` must release everything including `forceContextLoss()`
7. Crossfade via DOM compositor (CSS opacity), never React state

## State model (4 levels)
See `docs/state-model.md`.

## Worker protocol (latest-wins per kind)
```ts
type WorkerJobKind = 'layout' | 'propagation' | 'clustering' | 'labels' | 'visible-set'

interface WorkerJob<TInput> {
  jobId: number
  kind: WorkerJobKind
  revision: number
  input: TInput
}
```
Each engine maintains `latestRevisionByKind: Map<WorkerJobKind, number>`.
- On send: `latestRevisionByKind[kind]++`
- On receive: if `result.revision < latestRevisionByKind[kind]` → discard
- On destroy: abort all in-flight via `AbortController`

## GraphEngine blueprint (Three.js vanilla)

```ts
export class GraphEngine implements VisualEngine<GraphEngineInput> {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private nodesMesh!: THREE.InstancedMesh
  private frameId: number | null = null
  private worker!: Worker
  private latestRevisionByKind = new Map<WorkerJobKind, number>()
  private abortController: AbortController | null = null

  // Pre-allocated (avoid GC in render loop)
  private _matrix = new THREE.Matrix4()
  private _color = new THREE.Color()

  init(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    const geometry = new THREE.SphereGeometry(1, 8, 8)
    const material = new THREE.MeshPhongMaterial({ flatShading: true })
    this.nodesMesh = new THREE.InstancedMesh(geometry, material, 100000)
    this.nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.nodesMesh)

    this.worker = new Worker(new URL('./graph.worker.ts', import.meta.url), { type: 'module' })
    this.abortController = new AbortController()

    this.worker.onmessage = (e) => {
      const { kind, revision, output } = e.data
      const latest = this.latestRevisionByKind.get(kind) ?? 0
      if (revision < latest) return
      this.applyWorkerResult(kind, output)
    }

    this.loop()
  }

  update(input: GraphEngineInput) {
    for (let i = 0; i < input.nodeCount; i++) {
      this._matrix.setPosition(
        input.positions[i * 3],
        input.positions[i * 3 + 1],
        input.positions[i * 3 + 2]
      )
      this.nodesMesh.setMatrixAt(i, this._matrix)
    }
    this.nodesMesh.instanceMatrix.needsUpdate = true
  }

  private loop = () => {
    if (!this.renderer) return
    this.renderer.render(this.scene, this.camera)
    this.frameId = requestAnimationFrame(this.loop)
  }

  destroy() {
    if (this.frameId) cancelAnimationFrame(this.frameId)
    this.abortController?.abort()
    this.worker?.terminate()
    this.nodesMesh.geometry.dispose()
    (this.nodesMesh.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()   // CRITICAL
    this.renderer.domElement.remove()
    this.scene = null as any
    this.renderer = null as any
  }
}
```

## Worker (d3-force-3d)
```ts
import * as d3 from 'd3-force-3d'
let simulation: any

self.onmessage = (e: MessageEvent) => {
  const { jobId, kind, revision, input } = e.data
  if (simulation) simulation.stop()

  simulation = d3.forceSimulation(input.nodes, 3)
    .force('link', d3.forceLink(input.links).id((d: any) => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(0, 0, 0))
    .stop()

  for (let i = 0; i < 100; i++) simulation.tick()

  const positions = new Float32Array(input.nodes.length * 3)
  input.nodes.forEach((n: any, i: number) => {
    positions[i * 3] = n.x
    positions[i * 3 + 1] = n.y
    positions[i * 3 + 2] = n.z
  })

  self.postMessage({ jobId, kind, revision, output: { positions } }, [positions.buffer])
}
```

## Transition Stress Harness
```tsx
const MODES = ['globe', 'graph'] as const

export function EngineStressTest() {
  useEffect(() => {
    const actor = createActor(appMachine).start()
    let i = 0
    const interval = setInterval(() => {
      actor.send({
        type: 'URL_CHANGED',
        params: new URLSearchParams({ mode: MODES[i++ % MODES.length] })
      })
    }, 120)
    return () => { clearInterval(interval); actor.stop() }
  }, [])
  return null
}
```

### Success criteria
- Canvas count stable at 1-2
- GPU memory: mountain returning to base, not staircase up
- 60 FPS sustained during crossfade
- WebGL context count ≤2
- No orphan workers
- Heap growth flattens after warmup

## Open questions for sprint 2
- OffscreenCanvas — worth the hit-testing complexity?
- 3D vs 2D for graph layout (start 2D for performance?)
- Layout persistence in WorkspaceContext or re-run every open?
- DEGRADED mode VRAM/FPS threshold?
