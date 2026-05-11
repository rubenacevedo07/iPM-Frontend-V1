// src/engine/GraphBridge.ts
// Three.js vanilla bridge (no R3F). InstancedMesh placeholder; Worker layout in a later stage.

import * as THREE from 'three';
import type {
  EngineId,
  EngineInitInput,
  EngineViewInput,
  EngineFocusInput,
  GraphEngineInput,
} from './contracts/inputs';
import { createEmptyGraphEngineInput } from './contracts/inputs';
import type { IEngineBridge, BridgeCommand, BridgeEvent, Unsubscribe } from './contracts/bridge';

// ---------------------------------------------------------------------------
// GraphBridge
// ---------------------------------------------------------------------------

export class GraphBridge implements IEngineBridge {
  readonly engineId: EngineId = 'graph';

  private _status: IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];
  private _pendingEvents: BridgeEvent[] = [];

  private _graph: GraphEngineInput = createEmptyGraphEngineInput();

  private _renderer: THREE.WebGLRenderer | null = null;
  private _scene: THREE.Scene | null = null;
  private _camera: THREE.OrthographicCamera | null = null;
  private _instanced: THREE.InstancedMesh | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ro: ResizeObserver | null = null;
  private _raf: number | null = null;
  private _suspended = false;
  private _time = 0;

  private static readonly MAX_INSTANCES = 256;
  private readonly _workMatrix = new THREE.Matrix4();
  private readonly _workVec = new THREE.Vector3();

  constructor(input: EngineInitInput) {
    void this.init(input);
  }

  async init(input: EngineInitInput): Promise<void> {
    try {
      const { width, height } = input.container.getBoundingClientRect();
      const w = width || input.container.offsetWidth || window.innerWidth;
      const h = height || input.container.offsetHeight || window.innerHeight;

      input.container.dataset.engine = 'graph';

      this._scene = new THREE.Scene();
      this._scene.background = new THREE.Color(0x040b1a);

      const aspect = w / Math.max(h, 1);
      // Unit square mapping: x,y in roughly [-1,1] to match layout buffers.
      this._camera = new THREE.OrthographicCamera(
        -aspect, aspect, 1, -1, 0.1, 10,
      );
      this._camera.position.z = 2;

      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.9,
        depthTest: true,
      });
      this._instanced = new THREE.InstancedMesh(geometry, material, GraphBridge.MAX_INSTANCES);
      this._instanced.count = 0;
      this._scene.add(this._instanced);
      this._applyInstances();

      this._canvas = document.createElement('canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.inset = '0';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      this._canvas.style.display = 'block';
      input.container.appendChild(this._canvas);

      this._renderer = new THREE.WebGLRenderer({
        canvas: this._canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this._renderer.setSize(w, h, false);
      this._renderer.setClearColor(0x040b1a, 1);

      this._ro = new ResizeObserver(([entry]) => {
        const { width: rw, height: rh } = entry.contentRect;
        this.resize({ width: rw, height: rh });
      });
      this._ro.observe(input.container);

      this._status = 'ready';
      this._suspended = false;
      this._startLoop();

      queueMicrotask(() => {
        this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'graph' });
      });
    } catch (error) {
      this._status = 'failed';
      this._emitOrBuffer({ type: 'ENGINE.ERROR', engineId: 'graph', error: error as Error });
    }
  }

  setView(_input: EngineViewInput): void {
    // No separate view sub-modes in skeleton — graph is always the graph engine.
  }

  setFocus(_input: EngineFocusInput): void {
    // Camera / selection wiring when EntityRef + layout map exist (S2+).
  }

  suspend(): void {
    this._suspended = true;
    this._stopLoop();
  }

  resume(): void {
    if (this._status !== 'ready') return;
    this._suspended = false;
    this._startLoop();
  }

  dispose(): void {
    this._stopLoop();
    this._ro?.disconnect();
    this._ro = null;

    if (this._edgeLines && this._scene) {
      this._scene.remove(this._edgeLines);
      this._edgeLines.geometry.dispose();
      (this._edgeLines.material as THREE.Material).dispose();
      this._edgeLines = null;
    }

    if (this._instanced) {
      this._instanced.removeFromParent();
      this._instanced.geometry.dispose();
      (this._instanced.material as THREE.Material).dispose();
      this._instanced = null;
    }

    this._scene = null;
    this._camera = null;

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer.forceContextLoss();
      this._renderer = null;
    }
    this._canvas?.remove();
    this._canvas = null;

    this._status = 'disposed';
    this._handlers = [];
  }

  get status(): IEngineBridge['status'] {
    return this._status;
  }

  send(command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    switch (command.type) {
      case 'CMD.SET_VIEW':
        this.setView({ view: command.view });
        break;
      case 'CMD.SET_FOCUS':
        this.setFocus({ target: command.target });
        break;
      case 'CMD.SET_ENTITIES':
        break;
      case 'CMD.SET_ARCS':
        break;
      case 'CMD.SET_GRAPH': {
        this._graph = command.data.graph;
        this._applyInstances();
        this._rebuildEdgeLines();
        break;
      }
      case 'CMD.SUSPEND':
        this.suspend();
        break;
      case 'CMD.RESUME':
        this.resume();
        break;
      case 'CMD.DISPOSE':
        this.dispose();
        break;
    }
  }

  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    if (this._pendingEvents.length > 0) {
      this._pendingEvents.forEach((e) => handler(e));
      this._pendingEvents = [];
    }
    return () => {
      this._handlers = this._handlers.filter((h) => h !== handler);
    };
  }

  private resize(bounds: { width: number; height: number }): void {
    if (this._status !== 'ready' || !this._camera || !this._renderer) return;
    const w = Math.max(1, bounds.width);
    const h = Math.max(1, bounds.height);
    const aspect = w / h;
    this._camera.left = -aspect;
    this._camera.right = aspect;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h, false);
  }

  // Sprint 2 skeleton: one LineSegments for edges; filled when edgeCount>0.
  private _edgeLines: THREE.LineSegments | null = null;

  private _rebuildEdgeLines(): void {
    if (!this._scene) return;
    if (this._edgeLines) {
      this._scene.remove(this._edgeLines);
      const g = this._edgeLines.geometry;
      const m = this._edgeLines.material as THREE.Material;
      g.dispose();
      m.dispose();
      this._edgeLines = null;
    }
    const input = this._graph;
    if (input.edgeCount <= 0) return;
    const maxE = Math.min(input.edgeCount, 4096);
    const pos = new Float32Array(maxE * 2 * 3);
    let o = 0;
    for (let e = 0; e < maxE; e++) {
      const fi = input.edgeFrom[e];
      const ti = input.edgeTo[e];
      if (fi === undefined || ti === undefined) continue;
      const x0 = input.nodeXY[fi * 2] ?? 0;
      const y0 = input.nodeXY[fi * 2 + 1] ?? 0;
      const x1 = input.nodeXY[ti * 2] ?? 0;
      const y1 = input.nodeXY[ti * 2 + 1] ?? 0;
      pos[o++] = x0; pos[o++] = y0; pos[o++] = 0.02;
      pos[o++] = x1; pos[o++] = y1; pos[o++] = 0.02;
    }
    if (o === 0) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, o), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2a3f5c,
      transparent: true,
      opacity: 0.5,
    });
    this._edgeLines = new THREE.LineSegments(geom, lineMat);
    this._scene.add(this._edgeLines);
  }

  private _applyInstances(): void {
    if (!this._instanced) return;
    const mat = this._instanced.material as THREE.MeshBasicMaterial;
    const input = this._graph;
    const hasData = input.nodeCount > 0;
    const n = hasData
      ? Math.min(input.nodeCount, GraphBridge.MAX_INSTANCES)
      : 3;
    this._instanced.count = n;
    mat.color.setHex(0x00e5ff);
    for (let i = 0; i < n; i++) {
      let x: number; let y: number;
      if (hasData) {
        x = input.nodeXY[i * 2] ?? 0;
        y = input.nodeXY[i * 2 + 1] ?? 0;
      } else {
        const t = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        x = Math.cos(t) * 0.45;
        y = Math.sin(t) * 0.45;
      }
      this._workVec.set(x, y, 0);
      this._workMatrix.makeTranslation(this._workVec);
      this._instanced.setMatrixAt(i, this._workMatrix);
    }
    this._instanced.instanceMatrix.needsUpdate = true;
  }

  private _startLoop(): void {
    this._stopLoop();
    this._time = performance.now() / 1000;
    const tick = (now: number) => {
      this._raf = requestAnimationFrame(tick);
      if (this._suspended || this._status !== 'ready' || !this._scene || !this._camera || !this._renderer) {
        return;
      }
      const t = now / 1000;
      const dt = t - this._time;
      this._time = t;
      if (this._instanced) {
        this._instanced.rotation.z += dt * 0.2;
      }
      this._renderer.render(this._scene, this._camera);
    };
    this._raf = requestAnimationFrame(tick);
  }

  private _stopLoop(): void {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  private _emit(event: BridgeEvent): void {
    this._handlers.forEach((h) => h(event));
  }

  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) {
      this._emit(event);
    } else {
      this._pendingEvents.push(event);
    }
  }
}
