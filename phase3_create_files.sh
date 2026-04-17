#!/bin/bash
# Phase 3 — create GlobeBridge.ts + update engineFactory.ts + update bridge.ts
# Run from repo root: bash phase3_create_files.sh

set -e

echo "Creating src/engine/GlobeBridge.ts..."
cat > src/engine/GlobeBridge.ts << 'EOF'
// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer }     from '@deck.gl/layers';
import type { EngineId, EngineInitInput, EngineViewInput, EngineFocusInput } from './contracts/inputs';
import type { IEngineBridge, BridgeCommand, BridgeEvent, Unsubscribe }       from './contracts/bridge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_VIEW  = { longitude: 20, latitude: 25, zoom: 0.7, minZoom: 0, maxZoom: 5 };
const ROTATE_SPEED  = 3.5; // degrees per second

// External CDN — naturalearth 110m countries GeoJSON. No auth required.
// If CDN is unavailable, globe-countries layer silently renders empty (non-fatal).
const COUNTRIES_URL =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';

const GLOBE_BASE_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [{
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[-180, -89], [180, -89], [180, 89], [-180, 89], [-180, -89]]],
    },
    properties: {},
  }],
};

// ---------------------------------------------------------------------------
// GlobeBridge
// ---------------------------------------------------------------------------

export class GlobeBridge implements IEngineBridge {
  readonly engineId: EngineId = 'globe';

  private _status:   IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];

  private _deck:      Deck | null = null;
  private _ro:        ResizeObserver | null = null;
  private _rafHandle: number | null = null;
  private _container: HTMLDivElement | null = null;

  private _interactionTimeout: number | null = null;

  private _longitude  = INITIAL_VIEW.longitude;
  private _latitude   = INITIAL_VIEW.latitude;
  private _zoom       = INITIAL_VIEW.zoom;

  private _interacting = false;
  private _suspended   = false;
  private _focusedId:  string | null = null;
  private _lastT       = 0;

  private _pendingEvents: BridgeEvent[] = [];

  // ---------------------------------------------------------------------------
  // Constructor — matches NetworkBridge/ForceBridge stub pattern
  // ---------------------------------------------------------------------------

  constructor(input: EngineInitInput) {
    this.init(input);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async init(input: EngineInitInput): Promise<void> {
    this._container = input.container;

    try {
      const { width, height } = input.container.getBoundingClientRect();

      this._deck = new Deck({
        canvas:     this._createCanvas(input.container),
        width,
        height,
        views:      new DeckGlobeView({ id: 'globe' }),
        viewState:  { globe: { ...INITIAL_VIEW, longitude: this._longitude } },
        controller: true,
        layers:     this._buildLayers(),

        // TODO Phase 4: replace `any` with typed imports from @deck.gl/core
        onViewStateChange: ({ viewState }: any) => {
          this._interacting = true;
          this._longitude   = viewState.longitude ?? this._longitude;
          this._latitude    = viewState.latitude  ?? this._latitude;
          this._zoom        = viewState.zoom       ?? this._zoom;
          if (this._interactionTimeout !== null) {
            window.clearTimeout(this._interactionTimeout);
          }
          this._interactionTimeout = window.setTimeout(() => {
            this._interacting        = false;
            this._interactionTimeout = null;
          }, 2000);
        },

        // TODO Phase 4: replace `any` with typed imports from @deck.gl/core
        onClick: (info: any) => {
          if (info.layer?.id === 'globe-rings' && info.object) {
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
          }
        },

        // TODO Phase 4: replace `any` with typed imports from @deck.gl/core
        onHover: (info: any) => {
          const entity = info.layer?.id === 'globe-rings' ? (info.object ?? null) : null;
          this._emitOrBuffer({ type: 'ENGINE.ENTITY_HOVER', entity });
        },
      });

      this._ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        this._deck?.setProps({ width: w, height: h });
      });
      this._ro.observe(input.container);

      this._startRotation();

      this._status = 'ready';
      this._emit({ type: 'ENGINE.READY', engineId: 'globe' });
      this._pendingEvents.forEach(e => this._emit(e));
      this._pendingEvents = [];

    } catch (error) {
      this._status = 'failed';
      this._emitOrBuffer({ type: 'ENGINE.ERROR', engineId: 'globe', error: error as Error });
    }
  }

  setView(_input: EngineViewInput): void {
    // Globe always renders globe view — no-op for AtlasView mode changes
  }

  setFocus(input: EngineFocusInput): void {
    this._focusedId = input.target?.nodeId ?? null;
    if (input.target && this._deck) {
      this._flyTo(input.target);
    }
    this._redraw();
  }

  suspend(): void {
    this._suspended = true;
    this._stopRotation();
  }

  resume(): void {
    this._suspended = false;
    this._startRotation();
  }

  dispose(): void {
    this._stopRotation();
    if (this._interactionTimeout !== null) {
      window.clearTimeout(this._interactionTimeout);
      this._interactionTimeout = null;
    }
    this._ro?.disconnect();
    this._deck?.finalize();
    this._deck      = null;
    this._ro        = null;
    this._container = null;
    this._status    = 'disposed';
    // ENGINE.DISPOSED removed (YAGNI — add back when a consumer needs it)
    this._handlers  = [];
  }

  // ---------------------------------------------------------------------------
  // IEngineBridge protocol
  // ---------------------------------------------------------------------------

  get status(): IEngineBridge['status'] {
    return this._status;
  }

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped.
   */
  send(command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    switch (command.type) {
      case 'CMD.SET_VIEW':  this.setView({ view: command.view });      break;
      case 'CMD.SET_FOCUS': this.setFocus({ target: command.target }); break;
      case 'CMD.SUSPEND':   this.suspend();                             break;
      case 'CMD.RESUME':    this.resume();                              break;
      case 'CMD.DISPOSE':   this.dispose();                             break;
    }
  }

  /**
   * Register event listener. Flushes any pending events buffered before
   * this handler was registered (e.g. ENGINE.ERROR during init() before
   * EngineManager subscribed).
   */
  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    if (this._pendingEvents.length > 0) {
      this._pendingEvents.forEach(e => handler(e));
      this._pendingEvents = [];
    }
    return () => {
      this._handlers = this._handlers.filter(h => h !== handler);
    };
  }

  // ---------------------------------------------------------------------------
  // Private — DeckGL
  // ---------------------------------------------------------------------------

  private _createCanvas(container: HTMLDivElement): HTMLCanvasElement {
    const canvas          = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset    = '0';
    container.appendChild(canvas);
    return canvas;
  }

  private _buildLayers() {
    return [
      new GeoJsonLayer({
        id:           'globe-base',
        data:         GLOBE_BASE_GEOJSON,
        filled:       true,
        getFillColor: [4, 11, 26, 255],
        stroked:      false,
      }),
      new GeoJsonLayer({
        id:           'globe-countries',
        data:         COUNTRIES_URL,
        filled:       true,
        stroked:      true,
        getFillColor: [8, 20, 48, 80],
        getLineColor: [0, 229, 255, 25],
        lineWidthMinPixels: 0.5,
      }),
      new ScatterplotLayer({
        id:             'globe-rings',
        data:           [],
        pickable:       true,
        radiusUnits:    'meters',
        getRadius:      80_000,
        getFillColor:   [0, 229, 255, 40],
        getLineColor:   [0, 229, 255, 180],
        stroked:        true,
        lineWidthUnits: 'pixels',
        getLineWidth:   1.5,
        updateTriggers: { getFillColor: [this._focusedId], getRadius: [this._focusedId] },
      }),
    ];
  }

  private _redraw(): void {
    this._deck?.setProps({ layers: this._buildLayers() });
  }

  // ---------------------------------------------------------------------------
  // Private — rotation + flyTo
  // ---------------------------------------------------------------------------

  private _startRotation(): void {
    if (this._rafHandle !== null) return;
    this._lastT = 0;

    const tick = (t: number) => {
      if (!this._interacting && !this._suspended && !this._focusedId) {
        const dt         = this._lastT ? (t - this._lastT) / 1000 : 0;
        this._longitude += dt * ROTATE_SPEED;
        this._deck?.setProps({
          viewState: {
            globe: {
              longitude: this._longitude,
              latitude:  this._latitude,
              zoom:      this._zoom,
              minZoom:   0,
              maxZoom:   5,
            },
          },
        });
      }
      this._lastT     = t;
      this._rafHandle = requestAnimationFrame(tick);
    };

    this._rafHandle = requestAnimationFrame(tick);
  }

  private _stopRotation(): void {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  private _flyTo(_target: { nodeId: string }): void {
    // TODO Phase 3b: resolve entity coordinates from EntityRef and animate flyTo
  }

  // ---------------------------------------------------------------------------
  // Private — event emission
  // ---------------------------------------------------------------------------

  private _emit(event: BridgeEvent): void {
    this._handlers.forEach(h => h(event));
  }

  /**
   * Emit if handlers registered, otherwise buffer.
   * Guarantees ENGINE.ERROR during init() reaches EngineManager
   * even if onEvent() is called after init() completes.
   */
  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) {
      this._emit(event);
    } else {
      this._pendingEvents.push(event);
    }
  }
}
EOF

echo "Updating src/engine/contracts/bridge.ts — remove ENGINE.DISPOSED..."
cat > src/engine/contracts/bridge.ts << 'EOF'
// src/engine/contracts/bridge.ts
// Bridge contract — communication channel between AtlasView and an engine instance (Rule 4)

import type { EntityRef, AtlasView } from '@/domain/types';
import type { EngineId } from './inputs';

/** Canonical unsubscribe handle — matches XState/nanostores/zustand convention */
export type Unsubscribe = () => void;

/**
 * Events the engine emits UP to EngineManager (which forwards via sendParent to app.machine).
 *
 * Guaranteed emission order per engine lifecycle:
 *   1. ENGINE.READY     — exactly once, unless ENGINE.ERROR fires instead
 *   2. ENGINE.ENTITY_CLICK / ENGINE.ENTITY_HOVER — zero or more, only after READY
 *   3. ENGINE.DISPOSED  removed (YAGNI — add back when a consumer needs it)
 *
 * Implementors (GlobeBridge, future bridges) MUST buffer or drop any
 * interaction events that would fire before ENGINE.READY is emitted.
 */
export type BridgeEvent =
  | { type: 'ENGINE.READY';        engineId: EngineId }
  | { type: 'ENGINE.ERROR';        engineId: EngineId; error: Error }
  | { type: 'ENGINE.ENTITY_CLICK'; entity: EntityRef }
  | { type: 'ENGINE.ENTITY_HOVER'; entity: EntityRef | null };

/**
 * Commands app.machine sends DOWN to an engine via EngineManager → bridge.
 * One-directional: machine → engine only.
 */
export type BridgeCommand =
  | { type: 'CMD.SET_VIEW';  view: AtlasView }
  | { type: 'CMD.SET_FOCUS'; target: EntityRef | null }
  | { type: 'CMD.SUSPEND' }
  | { type: 'CMD.RESUME' }
  | { type: 'CMD.DISPOSE' };

/**
 * Bridge instance attached to a single engine slot.
 * EngineManager holds one bridge per slot.
 *
 * `status` is a live getter — read it on each access, not once at construction.
 */
export interface IEngineBridge {
  readonly engineId: EngineId;

  /** Live status — reflects current engine lifecycle position */
  readonly status: 'pending' | 'ready' | 'disposed' | 'failed';

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped by the implementation.
   */
  send(command: BridgeCommand): void;

  /** Register a listener for events coming up from the engine. Returns unsubscribe. */
  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe;
}

/** Registry entry — one per active engine slot, populated by bridgeRegistry */
export interface BridgeRegistryEntry {
  engineId: EngineId;
  bridge: IEngineBridge;
}
EOF

echo "Updating src/engine/engineFactory.ts — replace GlobeBridge stub with real import..."
cat > src/engine/engineFactory.ts << 'EOF'
// src/engine/engineFactory.ts
// Sync factory — returns bridge in `pending`, async init runs behind ENGINE.READY (Rule 4, Rule 5)

import type { EngineId, EngineInitInput } from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, BridgeCommand, Unsubscribe } from './contracts/bridge';
import { GlobeBridge } from './GlobeBridge';

// ---------------------------------------------------------------------------
// Base bridge implementation — shared by stub engines
// ---------------------------------------------------------------------------

class BaseBridge implements IEngineBridge {
  readonly engineId: EngineId;
  private _status: IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];

  constructor(engineId: EngineId) {
    this.engineId = engineId;
  }

  get status(): IEngineBridge['status'] {
    return this._status;
  }

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped.
   */
  send(_command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    // Concrete bridge overrides this to forward to engine
  }

  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter(h => h !== handler);
    };
  }

  protected emit(event: BridgeEvent): void {
    this._handlers.forEach(h => h(event));
  }

  protected setStatus(next: IEngineBridge['status']): void {
    this._status = next;
  }
}

// ---------------------------------------------------------------------------
// Engine stubs — network + force (real impl Phase 4+)
// ---------------------------------------------------------------------------

class NetworkBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('network');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'network';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'network' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'network', error: error as Error });
    }
  }
}

class ForceBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('force');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'force';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'force' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'force', error: error as Error });
    }
  }
}

// ---------------------------------------------------------------------------
// Registry + factory function
// ---------------------------------------------------------------------------

const engines: Record<EngineId, (input: EngineInitInput) => IEngineBridge> = {
  globe:   (input) => new GlobeBridge(input),   // real DeckGL bridge
  network: (input) => new NetworkBridge(input), // stub Phase 4+
  force:   (input) => new ForceBridge(input),   // stub Phase 4+
};

/**
 * Sync factory — returns bridge immediately in `pending` status.
 * Listen for ENGINE.READY before sending commands.
 */
export function createEngine(engineId: EngineId, input: EngineInitInput): IEngineBridge {
  const factory = engines[engineId];
  if (!factory) throw new Error(`Unknown engineId: ${engineId}`);
  return factory(input);
}
EOF

echo ""
echo "✅ Phase 3 files created/updated:"
echo "   src/engine/GlobeBridge.ts              (new)"
echo "   src/engine/contracts/bridge.ts         (ENGINE.DISPOSED removed)"
echo "   src/engine/engineFactory.ts            (GlobeBridge stub → real import)"
echo ""
echo "Next: git add + commit"
