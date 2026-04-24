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

  private _longitude = INITIAL_VIEW.longitude;
  private _latitude = INITIAL_VIEW.latitude;
  private _zoom = INITIAL_VIEW.zoom;

  // Phase 7.3: auto-rotation with non-competing pause during user interaction.
  // The 5009c61 removal was caused by rAF loop racing with zoom events. This
  // version pauses the rotation while isDragging / isZooming / isPanning is true,
  // eliminating the competition. Degrees added to _longitude per rAF tick.
  private _isInteracting = false;
  private readonly _rotationDegPerSec = 3; // ~6min for a full revolution at 60fps

  private _focusedId: string | null = null;
  // Phase 7: hover state tracked by onHover, consumed by _buildLayers for visual feedback.
  // Also drives ENGINE.ENTITY_HOVER dispatch (null on hover-out).
  private _hoveredId: string | null = null;
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
        onViewStateChange: ({ viewState, interactionState }: any) => {
          this._longitude = viewState.longitude ?? this._longitude;
          this._latitude = viewState.latitude ?? this._latitude;
          this._zoom = viewState.zoom ?? this._zoom;
          // Phase 7.3: pause auto-rotation during user interaction. Non-competing
          // with zoom/drag events — eliminates the 5009c61 zoom-lag regression.
          this._isInteracting = !!(
            interactionState?.isDragging ||
            interactionState?.isZooming  ||
            interactionState?.isPanning
          );
        },

        onClick: (info: any) => {
          if (info.layer?.id === 'globe-rings' && info.object) {
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
          }
        },

        onHover: (info: any) => {
          // Phase 7: hover emission wired. Only globe-rings is pickable.
          // Dispatch EntityRef on hover-in (info.object is the entity), null on hover-out.
          // Dedup: only emit when _hoveredId changes (avoids flood for same-object hovers).
          const hoveredNodeId = info.layer?.id === 'globe-rings' && info.object
            ? info.object.nodeId
            : null;
          if (hoveredNodeId === this._hoveredId) return;
          this._hoveredId = hoveredNodeId;
          this._emitOrBuffer({
            type: 'ENGINE.ENTITY_HOVER',
            entity: info.object && info.layer?.id === 'globe-rings' ? info.object : null,
          });
          this._redraw();
        },
      });

      this._ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        this._deck?.setProps({ width: w, height: h });
      });
      this._ro.observe(input.container);

      // Phase 7.3: auto-rotation restored with non-competing pause logic.
      // See _isInteracting flag (onViewStateChange) + _startRotation().
      this._startRotation();

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
    // Phase 7.3: stop auto-rotation during crossfade. engineManager sends
    // CMD.SUSPEND to previousBridge so its rAF loop doesn't waste frames.
    this._stopRotation();
  }

  resume(): void {
    // Phase 7.3: restart auto-rotation on crossfade rollback.
    if (this._status === 'ready' && this._rafHandle === null) {
      this._startRotation();
    }
  }

  dispose(): void {
    this._stopRotation();
    this._ro?.disconnect();
    this._deck?.finalize();
    this._deck = null;
    this._ro = null;
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
    // Phase 7: color table — informed by v3 useLayers3D.ts dotColor() (reference,
    // not verbatim port). V1-authored; EntityType here uses V1's UPPERCASE EntityRef
    // convention (app.events.ts EntityRef), not v3 @/types/overlays.EntityType lowercase.
    const dotColor = (type: string): [number, number, number, number] => {
      switch (type) {
        case 'PERSON':  return [0, 229, 255, 220]; // cyan — reserved for Phase 7.1
        case 'COMPANY': return [0, 212, 170, 220]; // teal
        case 'COUNTRY': return [245, 166, 35, 220]; // amber — unused in Phase 7
        default:        return [138, 155, 181, 200];
      }
    };

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
      // Phase 7: globe-rings — pickable entity dots, ring stroke, hover/focus-aware radius.
      new ScatterplotLayer({
        id: 'globe-rings',
        data: this._entities,
        pickable: true,
        radiusUnits: 'meters',
        getPosition:  (d: any) => [d.longitude, d.latitude],
        getRadius:    (d: any) => {
          if (d.nodeId === this._focusedId) return 120_000;
          if (d.nodeId === this._hoveredId) return 100_000;
          return 80_000;
        },
        getFillColor: (d: any) => {
          if (d.nodeId === this._focusedId) return [255, 255, 255, 240];
          if (d.nodeId === this._hoveredId) return [255, 255, 255, 180];
          const c = dotColor(d.type);
          // Slightly transparent fill so the decorative inner dot reads through
          return [c[0], c[1], c[2], 80];
        },
        getLineColor: (d: any) => {
          const c = dotColor(d.type);
          return [c[0], c[1], c[2], 255];
        },
        getLineWidth: (d: any) => (d.nodeId === this._focusedId ? 3 : 1.5),
        stroked: true,
        lineWidthUnits: 'pixels',
        updateTriggers: {
          getFillColor: [this._focusedId, this._hoveredId, this._entities.length],
          getRadius:    [this._focusedId, this._hoveredId, this._entities.length],
          getLineColor: [this._entities.length],
          getLineWidth: [this._focusedId],
          getPosition:  [this._entities.length],
        },
      }),
      // Phase 7: globe-dots — decorative inner fill, non-pickable. Reads through the
      // ring's translucent fill to give the "ring + dot" visual pattern from v3.
      new ScatterplotLayer({
        id: 'globe-dots',
        data: this._entities,
        pickable: false,
        radiusUnits: 'meters',
        getPosition:  (d: any) => [d.longitude, d.latitude],
        getRadius:    30_000,
        getFillColor: (d: any) => {
          const c = dotColor(d.type);
          return [c[0], c[1], c[2], 200];
        },
        updateTriggers: {
          getFillColor: [this._entities.length],
          getPosition:  [this._entities.length],
        },
      }),
    ];
  }

  private _redraw(): void {
    this._deck?.setProps({ layers: this._buildLayers() });
  }

  // ---------------------------------------------------------------------------
  // Private — auto-rotation (Phase 7.3) + flyTo (stub)
  // ---------------------------------------------------------------------------

  /**
   * Start the auto-rotation rAF loop. Advances _longitude by _rotationDegPerSec
   * per second (scaled by delta-time between frames so fps fluctuation doesn't
   * accelerate/decelerate the spin). Paused when _isInteracting is true — the
   * key change vs the 5009c61 removal, which looped unconditionally and caused
   * zoom lag by racing user-initiated viewState updates.
   *
   * Safe to call multiple times: noop if _rafHandle already set.
   */
  private _startRotation(): void {
    if (this._rafHandle !== null) return;
    let lastMs = performance.now();
    const tick = (nowMs: number) => {
      const dtSec = (nowMs - lastMs) / 1000;
      lastMs = nowMs;
      if (!this._isInteracting && this._deck && this._status === 'ready') {
        this._longitude = this._normalizeLongitude(
          this._longitude + this._rotationDegPerSec * dtSec,
        );
        this._deck.setProps({
          viewState: {
            longitude: this._longitude,
            latitude:  this._latitude,
            zoom:      this._zoom,
            minZoom:   0,
            maxZoom:   5,
          },
        });
      }
      this._rafHandle = requestAnimationFrame(tick);
    };
    this._rafHandle = requestAnimationFrame(tick);
  }

  /** Cancel the auto-rotation rAF loop. Called from suspend() + dispose(). */
  private _stopRotation(): void {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /** Keep longitude in [-180, 180] to avoid unbounded growth across long sessions. */
  private _normalizeLongitude(lng: number): number {
    const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
    return wrapped;
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