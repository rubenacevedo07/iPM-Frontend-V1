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

  // Phase 7.3g: auto-rotation via requestAnimationFrame (NOT LinearInterpolator).
  // 7.3c-7.3f attempted deck.gl's native transition system with LinearInterpolator
  // but onTransitionStart never fired on _GlobeView in deck.gl 9.3 — the
  // GlobeController does not drive TransitionManager the same way MapController
  // does. Empirical: setProps({viewState: {..., transitionDuration, interpolator}})
  // silently commits the target without animating on globe view.
  //
  // Going back to rAF is safe THIS time because we now have the writeback
  // pattern established in onViewStateChange — user gestures (drag/wheel) fire
  // onViewStateChange, we writeback their proposal to deck, and rAF resumes
  // from the updated _viewState on the next tick. The critical new piece is
  // _selfDriving: we raise it before rAF's own setProps to tell
  // onViewStateChange "this is my frame, don't writeback" (would cause infinite
  // recursion). onViewStateChange in controlled mode fires synchronously inside
  // setProps, so the flag semantics work.
  private _viewState: any = null; // full last-known viewState — never reassembled from scalars
  private _rafHandle: number | null = null;
  private _lastTickMs = 0;
  private _selfDriving = false;
  private _idleResumeTimer: ReturnType<typeof setTimeout> | null = null;
  private _userInteracting = false;

  private static readonly ROTATION_DEG_PER_SEC = 3;
  private static readonly IDLE_RESUME_MS = 800;

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

      // Phase 7.3g: start deck in CONTROLLED mode (viewState, not
      // initialViewState). TransitionManager requires a prior committed
      // viewState to animate from; starting uncontrolled and later passing
      // viewState with transitionDuration causes deck to commit the target
      // silently without running the transition (empirical: 7.3c-7.3f all
      // failed to rotate because deck had no "from" viewState). With
      // controlled mode from mount, the starting viewState IS the INITIAL_VIEW
      // we pass here, and subsequent setProps({viewState: {...,
      // transitionDuration, interpolator}}) triggers the transition correctly.
      this._viewState = { ...INITIAL_VIEW };
      this._deck = new Deck({
        canvas: this._createCanvas(input.container),
        width: resolvedW,
        height: resolvedH,
        views: new DeckGlobeView({ id: 'globe' }),
        viewState: { ...INITIAL_VIEW },
        controller: true,
        layers: this._buildLayers(),

        // TODO Phase 4: replace `any` with typed imports from @deck.gl/core
        onViewStateChange: ({ viewState, interactionState }: any) => {
          // Phase 7.3g: writeback pattern for controlled mode + rAF rotation.
          //
          // Three frame sources land here:
          // 1. Our rAF tick: _selfDriving=true. Capture viewState only — no
          //    writeback (would recurse infinitely: writeback → onViewStateChange
          //    → writeback → ...).
          // 2. Deck's initial handshake or internal viewState updates:
          //    _selfDriving=false, interactionState has no gesture flags.
          //    Writeback so controller's proposal commits; do NOT pause rotation.
          // 3. User input (drag/wheel/pan): _selfDriving=false, gesture flags
          //    set (drag/pan/rotate reliable; wheel's isZooming unreliable).
          //    Writeback + pause rotation + arm idle timer.
          if (this._selfDriving) {
            this._viewState = viewState;
            return;
          }
          this._viewState = viewState;
          this._deck?.setProps({ viewState });
          const userDriven = !!(
            interactionState?.isDragging ||
            interactionState?.isPanning  ||
            interactionState?.isZooming  ||
            interactionState?.isRotating
          );
          if (userDriven || this._idleResumeTimer !== null) {
            this._userInteracting = true;
            this._armIdleResume();
          }
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

      this._status = 'ready';

      // Phase 7.3g: start rAF-driven rotation. Must run AFTER status='ready' —
      // _startRAFRotation's tick guard checks status.
      this._startRAFRotation();

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
    // Phase 7.3g: hard-pause auto-rotation during crossfade. Stop the rAF
    // loop and raise _userInteracting so _startRAFRotation's guard bails on
    // any stray resume path.
    if (this._idleResumeTimer !== null) {
      clearTimeout(this._idleResumeTimer);
      this._idleResumeTimer = null;
    }
    this._userInteracting = true;
    this._stopRAFRotation();
  }

  resume(): void {
    if (this._status !== 'ready') return;
    this._userInteracting = false;
    this._startRAFRotation();
  }

  dispose(): void {
    if (this._idleResumeTimer !== null) {
      clearTimeout(this._idleResumeTimer);
      this._idleResumeTimer = null;
    }
    this._userInteracting = true;
    this._stopRAFRotation();
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
  // Private — auto-rotation (Phase 7.3g, rAF + writeback) + flyTo (stub)
  // ---------------------------------------------------------------------------

  /**
   * Start the rAF rotation loop. Each tick reads the latest _viewState
   * (updated either by our own prior tick or by a user-gesture writeback from
   * onViewStateChange), advances longitude by ROTATION_DEG_PER_SEC * dt, and
   * calls deck.setProps({ viewState: {...base, longitude: newLng} }).
   *
   * The _selfDriving flag tells onViewStateChange "this update is mine" so it
   * skips the writeback branch. In controlled mode, onViewStateChange fires
   * synchronously during setProps, so the flag is observable when the handler
   * runs.
   *
   * Pause: when _userInteracting is true, the tick skips the setProps step
   * but keeps requesting frames (cheap) so resumption is immediate once the
   * idle timer clears _userInteracting.
   */
  private _startRAFRotation(): void {
    if (this._rafHandle !== null) return;
    this._lastTickMs = 0;

    const tick = (ts: number) => {
      this._rafHandle = requestAnimationFrame(tick);

      if (!this._deck || this._status !== 'ready') {
        this._lastTickMs = ts;
        return;
      }
      if (this._userInteracting) {
        this._lastTickMs = ts;
        return;
      }

      const dt = this._lastTickMs === 0 ? 0 : (ts - this._lastTickMs) / 1000;
      this._lastTickMs = ts;

      const base = this._viewState ?? INITIAL_VIEW;
      const newLng = base.longitude + GlobeBridge.ROTATION_DEG_PER_SEC * dt;

      this._selfDriving = true;
      this._deck.setProps({
        viewState: { ...base, longitude: newLng },
      });
      this._selfDriving = false;

      // _selfDriving branch in onViewStateChange captured _viewState already,
      // but keep a belt-and-braces update in case deck doesn't re-emit in
      // some edge case (viewState unchanged from deck's perspective).
      this._viewState = { ...base, longitude: newLng };
    };

    this._rafHandle = requestAnimationFrame(tick);
  }

  private _stopRAFRotation(): void {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this._lastTickMs = 0;
  }

  /**
   * Arm / re-arm the idle-resume timer. Called from onViewStateChange when a
   * user gesture is detected. After IDLE_RESUME_MS of quiescence,
   * _userInteracting clears and the rAF tick resumes advancing longitude
   * from the current (user-modified) viewState.
   */
  private _armIdleResume(): void {
    if (this._idleResumeTimer !== null) {
      clearTimeout(this._idleResumeTimer);
    }
    this._idleResumeTimer = setTimeout(() => {
      this._idleResumeTimer = null;
      this._userInteracting = false;
      this._lastTickMs = 0; // reset dt so first resumed frame doesn't jump
    }, GlobeBridge.IDLE_RESUME_MS);
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