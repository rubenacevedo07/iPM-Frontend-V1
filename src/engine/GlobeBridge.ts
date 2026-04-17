// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type {
  EngineId,
  EngineInitInput,
  EngineViewInput,
  EngineFocusInput,
  EngineEntityData,
} from './contracts/inputs';
import type {
  IEngineBridge,
  BridgeCommand,
  BridgeEvent,
  Unsubscribe,
} from './contracts/bridge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_VIEW = { longitude: 20, latitude: 25, zoom: 0.7, minZoom: 0, maxZoom: 5 };
const ROTATE_SPEED = 3.5; // degrees per second — reserved for future auto-rotation

// External CDN: naturalearth 110m countries GeoJSON. No auth required.
// If CDN unavailable, globe-countries layer silently renders empty (non-fatal).
// TODO Phase 5+: host locally or use a proxy before production launch.
const COUNTRIES_URL =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';

const GLOBE_BASE_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[[-180, -89], [180, -89], [180, 89], [-180, 89], [-180, -89]]],
      },
      properties: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// GlobeBridge
// ---------------------------------------------------------------------------

export class GlobeBridge implements IEngineBridge {
  readonly engineId: EngineId = 'globe';

  private _status: IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];

  private _deck: Deck<any> | null = null;
  private _ro: ResizeObserver | null = null;
  private _rafHandle: number | null = null;
  private _container: HTMLDivElement | null = null;
  private _interactionTimeout: number | null = null;

  private _longitude = INITIAL_VIEW.longitude;
  private _latitude = INITIAL_VIEW.latitude;
  private _zoom = INITIAL_VIEW.zoom;

  private _interacting = false;
  private _suspended = false;
  private _focusedId: string | null = null;
  private _lastT = 0;

  // Event buffer — populated by _emitOrBuffer when no handlers are registered yet.
  // CONTRACT: drained ONLY by onEvent() when a handler registers. Never flushed
  // or cleared by init() or any other method. See Phase 3 post-mortem.
  private _pendingEvents: BridgeEvent[] = [];

  // Phase 4.1: entity data received via CMD.SET_ENTITIES.
  // Fed into globe-rings ScatterplotLayer. Mutated in send(), rendered via _redraw().
  private _entities: EngineEntityData['entities'] = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  constructor(input: EngineInitInput) {
    void this.init(input);
  }

  async init(input: EngineInitInput): Promise<void> {
    this._container = input.container;

    try {
      const { width, height } = input.container.getBoundingClientRect();
      const resolvedW = width || input.container.offsetWidth || window.innerWidth;
      const resolvedH = height || input.container.offsetHeight || window.innerHeight;

      this._deck = new Deck({
        canvas: this._createCanvas(input.container),
        width: resolvedW,
        height: resolvedH,
        views: new DeckGlobeView({ id: 'globe' }),
        initialViewState: {
          longitude: this._longitude,
          latitude: this._latitude,
          zoom: this._zoom,
          minZoom: 0,
          maxZoom: 5,
        },
        controller: true,
        layers: this._buildLayers(),

        // TODO Phase 4: replace `any` with typed imports from @deck.gl/core
        onViewStateChange: ({ viewState }: any) => {
          this._interacting = true;
          this._longitude = viewState.longitude ?? this._longitude;
          this._latitude = viewState.latitude ?? this._latitude;
          this._zoom = viewState.zoom ?? this._zoom;

          if (this._interactionTimeout !== null) {
            window.clearTimeout(this._interactionTimeout);
          }
          this._interactionTimeout = window.setTimeout(() => {
            this._interacting = false;
            this._interactionTimeout = null;
          }, 2000);
        },

        onClick: (info: any) => {
          if (info.layer?.id === 'globe-rings' && info.object) {
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
          }
        },

        onHover: (_info: any) => {
          // PHASE 4 TODO: re-enable hover emission when ScatterplotLayer has entities.
          // Disabled now because globe-rings is empty and hover would flood with null events.
          return;
        },
      });

      this._ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        this._deck?.setProps({ width: w, height: h });
      });
      this._ro.observe(input.container);

      // Auto-rotation disabled. Running a rAF loop with setProps({ viewState })
      // competes with DeckGL's internal controller during zoom gestures, causing
      // ~500ms-1s lag. Re-enable in Phase 4+ using a non-competing mechanism
      // (e.g., DeckGL transitionInterpolator, or a rAF gated strictly on no-interaction).
      // See ZOOM_LAG_KNOWN_ISSUE.md for diagnosis trail.
      // this._startRotation();

      this._status = 'ready';

      // Defer ENGINE.READY to next microtask. Guarantees any synchronous
      // subscribe() call that happens immediately after the constructor returns
      // will have registered its handler before the event fires. Also triggers
      // the buffer flush in onEvent() if the subscribe is later than expected.
      queueMicrotask(() => {
        this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
      });
    } catch (error) {
      this._status = 'failed';
      this._emitOrBuffer({
        type: 'ENGINE.ERROR',
        engineId: 'globe',
        error: error as Error,
      });
    }
  }

  setView(_input: EngineViewInput): void {
    // Globe always renders the globe view — no-op for AtlasView mode changes
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
    // Rotation intentionally not resumed — see init() comment on auto-rotation.
  }

  dispose(): void {
    this._stopRotation();
    if (this._interactionTimeout !== null) {
      window.clearTimeout(this._interactionTimeout);
      this._interactionTimeout = null;
    }
    this._ro?.disconnect();
    this._deck?.finalize();
    this._deck = null;
    this._ro = null;
    this._container = null;
    this._status = 'disposed';
    this._handlers = [];
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
      case 'CMD.SET_VIEW':
        this.setView({ view: command.view });
        break;
      case 'CMD.SET_FOCUS':
        this.setFocus({ target: command.target });
        break;
      case 'CMD.SET_ENTITIES':
        this._entities = command.data.entities;
        this._redraw();
        break;
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

  /**
   * Register event listener. Flushes any pending events buffered before this
   * handler was registered (e.g. ENGINE.READY emitted during init() before
   * EngineManager subscribed). This is the only place where _pendingEvents
   * is drained.
   */
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

  // ---------------------------------------------------------------------------
  // Private — DeckGL helpers
  // ---------------------------------------------------------------------------

  private _createCanvas(container: HTMLDivElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    container.appendChild(canvas);
    return canvas;
  }

  private _buildLayers() {
    return [
      new GeoJsonLayer({
        id: 'globe-base',
        data: GLOBE_BASE_GEOJSON,
        filled: true,
        getFillColor: [4, 11, 26, 255],
        stroked: false,
      }),
      new GeoJsonLayer({
        id: 'globe-countries',
        data: COUNTRIES_URL,
        filled: true,
        stroked: true,
        getFillColor: [8, 20, 48, 80],
        getLineColor: [0, 229, 255, 25],
        lineWidthMinPixels: 0.5,
      }),
      new ScatterplotLayer({
        id: 'globe-rings',
        data: this._entities,
        pickable: true,
        radiusUnits: 'meters',
        getPosition:  (d: any) => [d.longitude, d.latitude],
        getRadius:    (d: any) => (d.isChokepoint ? 120_000 : 80_000),
        getFillColor: (d: any) => (d.isChokepoint ? [255, 180, 0, 120] : [0, 229, 255, 80]),
        getLineColor: (d: any) => (d.isChokepoint ? [255, 200, 40, 220] : [0, 229, 255, 200]),
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        updateTriggers: {
          getFillColor: [this._focusedId, this._entities.length],
          getRadius:    [this._focusedId, this._entities.length],
          getPosition:  [this._entities.length],
        },
      }),
    ];
  }

  private _redraw(): void {
    this._deck?.setProps({ layers: this._buildLayers() });
  }

  // ---------------------------------------------------------------------------
  // Private — rotation (kept but not called) + flyTo (stub)
  // ---------------------------------------------------------------------------

  private _startRotation(): void {
    if (this._rafHandle !== null) return;
    this._lastT = 0;

    const tick = (t: number) => {
      if (!this._interacting && !this._suspended && !this._focusedId) {
        const dt = this._lastT ? (t - this._lastT) / 1000 : 0;
        this._longitude += dt * ROTATE_SPEED;
        this._deck?.setProps({
          viewState: {
            longitude: this._longitude,
            latitude: this._latitude,
            zoom: this._zoom,
            minZoom: 0,
            maxZoom: 5,
          },
        });
      }
      this._lastT = t;
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
    this._handlers.forEach((h) => h(event));
  }

  /**
   * Emit if handlers are registered, otherwise buffer for later drain.
   * CONTRACT: _pendingEvents is drained ONLY by onEvent() when a handler
   * registers. Never flushed or cleared elsewhere.
   */
  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) {
      this._emit(event);
    } else {
      this._pendingEvents.push(event);
    }
  }
}