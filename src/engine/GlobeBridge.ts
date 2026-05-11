// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ArcLayer, GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import {
  POWER_MAP_CONFIGS,
  HORMUZ_COUNTRY_TIERS,
  HORMUZ_TIER_TINTS,
  POWERMAP_TYPE_COLOR,
} from './powermapData';
import type { PowerMapEntity, PowerMapEdge } from './powermapData';
import type {
  EngineId,
  EngineInitInput,
  EngineViewInput,
  EngineFocusInput,
  EngineEntityData,
  EngineArc,
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

const INITIAL_VIEW = { longitude: 20, latitude: 25, zoom: 2, minZoom: 0, maxZoom: 5 };

// Local slim GeoJSON (only iso_a3, name, continent, region_un props).
// Served from /public — no network round-trip on startup. Was the single
// biggest startup blocker (~1800ms CDN download in dev trace).
const COUNTRIES_URL = '/ne_110m_countries_slim.geojson';

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
  private _canvas: HTMLCanvasElement | null = null;
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

  // Phase 8+: ArcLayer styling. Colors updated to PINK (suppliers) and PURPLE (clients).
  // Width clamps are pixels at any zoom (widthUnits: 'pixels' on the layer).
  private static readonly ARC_COLOR_SUPPLIER:   [number, number, number] = [232, 80,  122];
  private static readonly ARC_COLOR_CLIENT:     [number, number, number] = [160, 100, 255];
  private static readonly ARC_COLOR_CONNECTION: [number, number, number] = [0,   229, 255];
  private static readonly ARC_COLOR_PARTNER:    [number, number, number] = [245, 166, 35];
  private static readonly ARC_WIDTH_MIN = 1;
  private static readonly ARC_WIDTH_MAX = 4;

  private _focusedId: string | null = null;
  // Phase 7: hover state tracked by onHover, consumed by _buildLayers for visual feedback.
  // Also drives ENGINE.ENTITY_HOVER dispatch (null on hover-out).
  private _hoveredId: string | null = null;

  // Click ripple animation — driven by a dedicated RAF loop separate from rotation.
  private _clickEntity: any = null;
  private _clickAnimStart = 0;
  private _clickAnimRAF: number | null = null;
  // Event buffer — populated by _emitOrBuffer when no handlers are registered yet.
  // CONTRACT: drained ONLY by onEvent() when a handler registers. Never flushed
  // or cleared by init() or any other method. See Phase 3 post-mortem.
  private _pendingEvents: BridgeEvent[] = [];

  // Phase 4.1: entity data received via CMD.SET_ENTITIES.
  // Fed into globe-rings ScatterplotLayer. Mutated in send(), rendered via _redraw().
  private _entities: EngineEntityData['entities'] = [];

  // Phase 8: network arcs received via CMD.SET_ARCS.
  // Fed into globe-arcs ArcLayer. _arcsRevision is a monotonic counter used in
  // updateTriggers — bumps every commit even when arcs.length stays the same
  // (A→B navigation with identical arc counts but different targets), so
  // deck.gl re-evaluates accessors. Using .length alone misses that case.
  private _arcs: EngineArc[] = [];
  private _arcsRevision = 0;

  private _activePowerMapId: string | null = null;
  private _pmEntities: PowerMapEntity[] = [];
  private _pmEdges:    PowerMapEdge[]    = [];
  private _rotationEnabled = true;
  private _flyToTimer: ReturnType<typeof setTimeout> | null = null;

  // Arrival pulse — single expanding gold ring when fly-to completes.
  private _arrivalCoords: [number, number] | null = null;
  private _arrivalAnimStart = 0;
  private _arrivalAnimRAF: number | null = null;

  // Idle connection arcs — soft pulsing arcs between top-30 entities when globe is rotating.
  private _idleArcs: Array<{ src: [number, number]; dst: [number, number]; phase: number }> = [];
  private _idleAnimTime = 0;
  private _idleInterval: ReturnType<typeof setInterval> | null = null;

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
      const canvas = this._createCanvas(input.container);
      this._canvas = canvas;
      // Set backing-buffer dimensions BEFORE creating the GL context.
      // With gl: externalCtx passed to Deck, deck.gl may skip its initial
      // canvas resize — leaving the default 300×150 backing buffer and
      // CSS-upscaling to fill the container (the "8-bit" look).
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(resolvedW * dpr);
      canvas.height = Math.round(resolvedH * dpr);
      const gl = (
        canvas.getContext('webgl2', { alpha: false, stencil: true, depth: true }) ||
        canvas.getContext('webgl',  { alpha: false, stencil: true, depth: true })
      ) as WebGLRenderingContext;
      this._deck = new Deck({
        gl: gl as any,
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
            this._flyTo(info.object);
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
            this._startClickAnim(info.object);
          }
        },

        onHover: (info: any) => {
          // Phase 7: hover emission wired. Only globe-rings is pickable.
          // Dispatch EntityRef on hover-in (info.object is the entity), null on hover-out.
          // Dedup: only emit when _hoveredId changes (avoids flood for same-object hovers).
          const hoveredNodeId =
            (info.layer?.id === 'globe-rings' || info.layer?.id === 'globe-pm-rings') && info.object
              ? (info.object.nodeId ?? info.object.id ?? null)
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
        const r = window.devicePixelRatio || 1;
        if (this._canvas) {
          this._canvas.width  = Math.round(w * r);
          this._canvas.height = Math.round(h * r);
        }
        this._deck?.setProps({ width: w, height: h });
      });
      this._ro.observe(input.container);

      this._status = 'ready';

      // Phase 7.3g: start rAF-driven rotation. Must run AFTER status='ready' —
      // _startRAFRotation's tick guard checks status.
      this._startRAFRotation();
      this._startIdlePulse();

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
    if (this._rotationEnabled) this._startRAFRotation();
  }

  dispose(): void {
    if (this._flyToTimer !== null) {
      clearTimeout(this._flyToTimer);
      this._flyToTimer = null;
    }
    if (this._idleResumeTimer !== null) {
      clearTimeout(this._idleResumeTimer);
      this._idleResumeTimer = null;
    }
    this._userInteracting = true;
    this._stopRAFRotation();
    this._stopClickAnim();
    this._stopArrivalPulse();
    this._stopIdlePulse();
    this._ro?.disconnect();
    this._deck?.finalize();
    this._canvas?.remove();
    this._deck = null;
    this._canvas = null;
    this._ro = null;
    this._status = 'disposed';
    this._handlers = [];
    this._entities = [];
    this._arcs = [];
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
        this._idleArcs = this._buildIdleArcs();
        this._redraw();
        break;
      case 'CMD.SET_ARCS': {
        // Short-circuit: incoming and current both empty → no rebuild. Prevents
        // redundant layer churn on repeated CLOSE_OVERLAY dispatches and on
        // initial mount when no overlay is open.
        const incoming = command.data.arcs;
        if (this._arcs.length === 0 && incoming.length === 0) break;
        this._arcs = incoming;
        this._arcsRevision++;
        this._redraw();
        break;
      }
      case 'CMD.SET_POWERMAP': {
        this._activePowerMapId = command.powermapId;
        const cfg = command.powermapId ? POWER_MAP_CONFIGS[command.powermapId] : undefined;
        this._pmEntities = cfg?.entities ?? [];
        this._pmEdges    = cfg?.edges    ?? [];
        this._redraw();
        break;
      }
      case 'CMD.SET_ROTATION': {
        // ═══════════════════════════════════════════════════════════════════
        // ROTATION LIFECYCLE — Rule 7 (CLAUDE.md), single source of truth
        // ═══════════════════════════════════════════════════════════════════
        // Auto-rotation is controlled SOLELY by this command. AppShell sends
        // SET_ROTATION false whenever an overlay or power map is active and
        // SET_ROTATION true when none are. No other code path should start or
        // stop the rotation RAF — not fly-to completion, not idle timers, not
        // gesture handlers. This prevents the recurring bug where the globe
        // keeps rotating after the cinematic fly-to completes while an
        // overlay is open.
        //
        // The cinematic fly-to is a separate RAF loop (see _executeFlyTo). It
        // is NEVER cancelled — the camera always lands on the target — but it
        // does not re-enable rotation on completion. If the user is in an
        // overlay when fly-to ends, the globe rests on the target. If not, the
        // rotation RAF is already running underneath (see init at line 263).
        // ═══════════════════════════════════════════════════════════════════
        this._rotationEnabled = command.enabled;
        if (command.enabled) {
          // Clear any lingering user-interaction block so the loop actually advances.
          this._userInteracting = false;
          this._startRAFRotation(); // (re)start the loop — no-op if already running
          this._startIdlePulse();
        } else {
          // Hard-stop auto-rotation. In-flight fly-to is intentionally left
          // alone so the cinematic completes.
          this._stopRAFRotation();
          if (this._idleResumeTimer !== null) {
            clearTimeout(this._idleResumeTimer);
            this._idleResumeTimer = null;
          }
          this._userInteracting = true; // belt-and-braces
          this._stopIdlePulse();
        }
        break;
      }
      case 'CMD.FLY_TO':
        this._executeFlyTo(
          command.longitude,
          command.latitude,
          command.zoom ?? 2.0,
          command.duration ?? 2000,
          () => { this._startArrivalPulse(command.longitude, command.latitude); },
        );
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
    // Idle skin — dark navy continents with visible borders.
    const IDLE_FILL:   [number,number,number,number] = [18, 54, 105, 255];
    const IDLE_STROKE: [number,number,number,number] = [55, 120, 190, 140];
    const pmCfg = this._activePowerMapId ? POWER_MAP_CONFIGS[this._activePowerMapId] : undefined;

    const getCountryFill = (f: any): [number,number,number,number] => {
      const name: string = f.properties?.name ?? f.properties?.NAME ?? '';
      if (pmCfg?.countryTierMode === 'hormuz') {
        const tier = HORMUZ_COUNTRY_TIERS[name];
        if (tier) return HORMUZ_TIER_TINTS[tier].fill;
      } else if (pmCfg?.highlightCountries?.includes(name) && pmCfg.countryFill) {
        return pmCfg.countryFill;
      }
      return IDLE_FILL;
    };
    const getCountryStroke = (f: any): [number,number,number,number] => {
      const name: string = f.properties?.name ?? f.properties?.NAME ?? '';
      if (pmCfg?.countryTierMode === 'hormuz') {
        const tier = HORMUZ_COUNTRY_TIERS[name];
        if (tier) return HORMUZ_TIER_TINTS[tier].stroke;
      } else if (pmCfg?.highlightCountries?.includes(name) && pmCfg.countryStroke) {
        return pmCfg.countryStroke;
      }
      return IDLE_STROKE;
    };

    // Phase 7: color table — informed by v3 useLayers3D.ts dotColor() (reference,
    // not verbatim port). V1-authored; EntityType here uses V1's UPPERCASE EntityRef
    // convention (app.events.ts EntityRef), not v3 @/types/overlays.EntityType lowercase.
    const dotColor = (type: string, isGold: boolean = false): [number, number, number, number] => {
      switch (type) {
        case 'PERSON':  return [0, 229, 255, 220]; // cyan — reserved for Phase 7.1
        case 'COMPANY': return isGold ? [212, 175, 55, 220] : [0, 212, 170, 220]; // gold : teal
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
        getFillColor: getCountryFill,
        getLineColor: getCountryStroke,
        lineWidthMinPixels: 0.8,
        updateTriggers: {
          getFillColor: [this._activePowerMapId],
          getLineColor: [this._activePowerMapId],
        },
      }),
      // Phase 8: globe-arcs — supplier (amber) + client (cyan) network edges.
      // Inserted BELOW globe-rings so picking on entity dots stays unaffected
      // (arcs are non-pickable — they're decorative context for the open
      // company overlay). greatCircle: true makes arcs follow globe curvature
      // (verified to work on _GlobeView, unlike LinearInterpolator transitions
      // — see docs/deck-gl-9-reference.md §5).
      new ArcLayer<EngineArc>({
        id: 'globe-arcs',
        data: this._arcs,
        pickable: false,
        greatCircle: true,
        widthUnits: 'pixels',
        getSourcePosition: (a) => a.source,
        getTargetPosition: (a) => a.target,
        getSourceColor: (a) => {
          const c = a.kind === 'supplier'   ? GlobeBridge.ARC_COLOR_SUPPLIER
                  : a.kind === 'client'     ? GlobeBridge.ARC_COLOR_CLIENT
                  : a.kind === 'connection' ? GlobeBridge.ARC_COLOR_CONNECTION
                  :                          GlobeBridge.ARC_COLOR_PARTNER;
          return [c[0], c[1], c[2], Math.round(a.intensity * 255)];
        },
        getTargetColor: (a) => {
          const c = a.kind === 'supplier'   ? GlobeBridge.ARC_COLOR_SUPPLIER
                  : a.kind === 'client'     ? GlobeBridge.ARC_COLOR_CLIENT
                  : a.kind === 'connection' ? GlobeBridge.ARC_COLOR_CONNECTION
                  :                          GlobeBridge.ARC_COLOR_PARTNER;
          return [c[0], c[1], c[2], Math.round(a.intensity * 255)];
        },
        getWidth: (a) => GlobeBridge.ARC_WIDTH_MIN +
          a.intensity * (GlobeBridge.ARC_WIDTH_MAX - GlobeBridge.ARC_WIDTH_MIN),
        getHeight: 0.2,
        updateTriggers: {
          getSourcePosition: [this._arcsRevision],
          getTargetPosition: [this._arcsRevision],
          getSourceColor:    [this._arcsRevision],
          getTargetColor:    [this._arcsRevision],
          getWidth:          [this._arcsRevision],
        },
      }),
      // Phase 8+: globe-selected-halo — cyan ring around focused entity at 300k radius
      new ScatterplotLayer({
        id: 'globe-selected-halo',
        data: this._focusedId ? this._entities.filter(e => e.nodeId === this._focusedId) : [],
        pickable: false,
        radiusUnits: 'meters',
        getPosition:  (d: any) => [d.longitude, d.latitude],
        getRadius:    300_000,
        getFillColor: [0, 0, 0, 0],
        getLineColor: [0, 229, 255, 200],
        getLineWidth: 2,
        stroked: true,
        lineWidthUnits: 'pixels',
        updateTriggers: {
          data: [this._focusedId],
        },
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
          if (d.nodeId === this._focusedId) return [0, 229, 255, 80];
          if (d.nodeId === this._hoveredId) return [255, 255, 255, 180];
          const c = dotColor(d.type, d.isGold);
          // Slightly transparent fill so the decorative inner dot reads through
          return [c[0], c[1], c[2], 80];
        },
        getLineColor: (d: any) => {
          const c = dotColor(d.type, d.isGold);
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
          const c = dotColor(d.type, d.isGold);
          return [c[0], c[1], c[2], 200];
        },
        updateTriggers: {
          getFillColor: [this._entities.length],
          getPosition:  [this._entities.length],
        },
      }),
      // PowerMap entity halo — soft glow behind ring, non-pickable
      new ScatterplotLayer<PowerMapEntity>({
        id: 'globe-pm-halo',
        data: this._pmEntities,
        pickable: false,
        radiusUnits: 'pixels' as const,
        getPosition: (d) => d.coords,
        getRadius: 18,
        getFillColor: (d) => {
          const c = POWERMAP_TYPE_COLOR[d.type];
          return [c[0], c[1], c[2], 22] as [number,number,number,number];
        },
        stroked: false,
        parameters: { depthTest: false } as any,
        updateTriggers: { data: [this._activePowerMapId] },
      }),
      // PowerMap entity rings — pickable, hover-aware
      new ScatterplotLayer<PowerMapEntity>({
        id: 'globe-pm-rings',
        data: this._pmEntities,
        pickable: true,
        radiusUnits: 'pixels' as const,
        getPosition: (d) => d.coords,
        getRadius: (d) => d.id === this._hoveredId ? 9 : 7,
        getFillColor: (d) => {
          const c = POWERMAP_TYPE_COLOR[d.type];
          return [c[0], c[1], c[2], 50] as [number,number,number,number];
        },
        getLineColor: (d) => {
          const c = POWERMAP_TYPE_COLOR[d.type];
          return [c[0], c[1], c[2], 240] as [number,number,number,number];
        },
        stroked: true,
        lineWidthUnits: 'pixels' as const,
        getLineWidth: 1.5,
        parameters: { depthTest: false } as any,
        updateTriggers: {
          data: [this._activePowerMapId],
          getRadius: [this._hoveredId],
          getFillColor: [this._hoveredId],
        },
      }),
      // PowerMap arcs — hostile edges in red, others use accent color
      new ArcLayer<PowerMapEdge>({
        id: 'globe-pm-arcs',
        data: this._pmEdges,
        pickable: false,
        greatCircle: true,
        widthUnits: 'pixels' as const,
        getSourcePosition: (d) => d.from,
        getTargetPosition: (d) => d.to,
        getSourceColor: (d) => {
          const a = this._activePowerMapId
            ? (POWER_MAP_CONFIGS[this._activePowerMapId]?.accentRgb ?? [0, 229, 255])
            : [0, 229, 255];
          return d.hostile
            ? [229, 57, 53, 200] as [number,number,number,number]
            : [a[0], a[1], a[2], 180] as [number,number,number,number];
        },
        getTargetColor: (d) => {
          const a = this._activePowerMapId
            ? (POWER_MAP_CONFIGS[this._activePowerMapId]?.accentRgb ?? [0, 229, 255])
            : [0, 229, 255];
          return d.hostile
            ? [229, 57, 53, 80] as [number,number,number,number]
            : [a[0], a[1], a[2], 80] as [number,number,number,number];
        },
        getWidth: (d) => 0.8 + (d.strength ?? 0.5) * 1.4,
        parameters: { depthTest: false } as any,
        updateTriggers: { data: [this._activePowerMapId] },
      }),

      // Click ripple — 3 concentric rings expanding from the clicked entity position.
      // Driven by _clickAnimRAF; each ring staggered 200ms. Radius 80k→450k meters,
      // opacity fades to 0. Uses geo coordinates so rings follow globe rotation.
      // Idle connection arcs — subtle pulsing lines between top-30 entities; only in idle (rotating, no overlay/powermap).
      ...(this._rotationEnabled && !this._activePowerMapId && this._arcs.length === 0 && this._idleArcs.length > 0
        ? [new ArcLayer({
            id: 'globe-idle-arcs',
            data: this._idleArcs,
            pickable: false,
            greatCircle: true,
            widthUnits: 'pixels' as const,
            getSourcePosition: (d: any) => d.src,
            getTargetPosition: (d: any) => d.dst,
            getSourceColor: (d: any) => {
              const pulse = (Math.sin(this._idleAnimTime * 0.7 + d.phase) + 1) / 2;
              return [0, 229, 255, Math.round(8 + pulse * 32)] as [number,number,number,number];
            },
            getTargetColor: (d: any) => {
              const pulse = (Math.sin(this._idleAnimTime * 0.7 + d.phase) + 1) / 2;
              return [0, 180, 220, Math.round(4 + pulse * 16)] as [number,number,number,number];
            },
            getWidth: 0.5,
            parameters: { depthTest: false } as any,
            updateTriggers: {
              getSourceColor: [this._idleAnimTime],
              getTargetColor: [this._idleAnimTime],
            },
          })]
        : []),

      // Arrival pulse — single gold ring expanding from fly-to destination.
      ...(this._arrivalCoords
        ? (() => {
            const elapsed = Math.max(0, performance.now() - this._arrivalAnimStart);
            const progress = Math.min(1, elapsed / 1000);
            const radius = 50_000 + progress * 520_000;
            const alpha  = Math.round((1 - progress) * (1 - progress) * 200);
            return [new ScatterplotLayer({
              id: 'globe-arrival-pulse',
              data: [{ longitude: this._arrivalCoords[0], latitude: this._arrivalCoords[1] }],
              pickable: false,
              radiusUnits: 'meters',
              getPosition:  (d: any) => [d.longitude, d.latitude],
              getRadius:    radius,
              getFillColor: [0, 0, 0, 0] as [number,number,number,number],
              getLineColor: [245, 195, 60, alpha] as [number,number,number,number],
              getLineWidth: 1.5,
              stroked: true,
              lineWidthUnits: 'pixels',
              updateTriggers: { getRadius: [radius], getLineColor: [alpha] },
            })];
          })()
        : []),

      ...(this._clickEntity
        ? ([0, 200, 400] as const).map((delay, i) => {
            const elapsed = Math.max(0, performance.now() - this._clickAnimStart - delay);
            if (elapsed <= 0) return null;
            const progress = Math.min(1, elapsed / 700);
            const radius   = 80_000 + progress * 370_000;
            const alpha    = Math.round((1 - progress) * 180);
            return new ScatterplotLayer({
              id: `globe-click-ripple-${i}`,
              data: [this._clickEntity],
              pickable: false,
              radiusUnits: 'meters',
              getPosition:  (d: any) => [d.longitude, d.latitude],
              getRadius:    radius,
              getFillColor: [0, 0, 0, 0] as [number, number, number, number],
              getLineColor: [0, 229, 255, alpha] as [number, number, number, number],
              getLineWidth: 2,
              stroked: true,
              lineWidthUnits: 'pixels',
              updateTriggers: { getRadius: [radius], getLineColor: [alpha] },
            });
          }).filter(Boolean) as ScatterplotLayer<any>[]
        : []),
    ];
  }

  private _redraw(): void {
    this._deck?.setProps({ layers: this._buildLayers() });
  }

  private _startArrivalPulse(lng: number, lat: number): void {
    this._arrivalCoords   = [lng, lat];
    this._arrivalAnimStart = performance.now();
    if (this._arrivalAnimRAF !== null) cancelAnimationFrame(this._arrivalAnimRAF);
    const tick = () => {
      const elapsed = performance.now() - this._arrivalAnimStart;
      if (elapsed > 1200) {
        this._arrivalCoords  = null;
        this._arrivalAnimRAF = null;
        this._redraw();
        return;
      }
      this._arrivalAnimRAF = requestAnimationFrame(tick);
      this._redraw();
    };
    this._arrivalAnimRAF = requestAnimationFrame(tick);
  }

  private _stopArrivalPulse(): void {
    if (this._arrivalAnimRAF !== null) cancelAnimationFrame(this._arrivalAnimRAF);
    this._arrivalAnimRAF = null;
    this._arrivalCoords  = null;
  }

  private _buildIdleArcs(): Array<{ src: [number, number]; dst: [number, number]; phase: number }> {
    const n = Math.min(this._entities.length, 30);
    if (n < 2) return [];
    const result = [];
    const count = Math.min(18, Math.floor(n * 0.7));
    for (let i = 0; i < count; i++) {
      const a = this._entities[i % n];
      const b = this._entities[(i * 7 + 4) % n];
      if (a === b) continue;
      result.push({
        src:   [a.longitude, a.latitude]  as [number, number],
        dst:   [b.longitude, b.latitude]  as [number, number],
        phase: (i / count) * Math.PI * 2,
      });
    }
    return result;
  }

  private _startIdlePulse(): void {
    if (this._idleInterval !== null) return;
    this._idleInterval = setInterval(() => {
      this._idleAnimTime += 0.067;
      if (this._rotationEnabled && !this._activePowerMapId && this._arcs.length === 0 && this._idleArcs.length > 0) {
        this._redraw();
      }
    }, 67);
  }

  private _stopIdlePulse(): void {
    if (this._idleInterval !== null) {
      clearInterval(this._idleInterval);
      this._idleInterval = null;
    }
  }

  private _startClickAnim(entity: any): void {
    this._clickEntity   = entity;
    this._clickAnimStart = performance.now();
    if (this._clickAnimRAF !== null) cancelAnimationFrame(this._clickAnimRAF);

    const tick = () => {
      const elapsed = performance.now() - this._clickAnimStart;
      if (elapsed > 1200) {
        this._clickEntity   = null;
        this._clickAnimRAF  = null;
        this._redraw();
        return;
      }
      this._clickAnimRAF = requestAnimationFrame(tick);
      this._redraw();
    };
    this._clickAnimRAF = requestAnimationFrame(tick);
  }

  private _stopClickAnim(): void {
    if (this._clickAnimRAF !== null) cancelAnimationFrame(this._clickAnimRAF);
    this._clickAnimRAF = null;
    this._clickEntity  = null;
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
      // ───────────────────────────────────────────────────────────────────
      // Rule 7 belt-and-braces: SELF-TERMINATE if rotation has been disabled.
      // The order matters — check BEFORE re-scheduling. If we re-scheduled
      // first and then bailed (the previous pattern), the RAF would keep
      // scheduling itself forever, and any code that flipped _userInteracting
      // back to false would cause rotation to silently resume.
      //
      // Now: when _rotationEnabled goes false, the tick stops re-scheduling
      // → the RAF loop terminates naturally even if `_stopRAFRotation`'s
      // `cancelAnimationFrame` somehow missed (e.g., during a render race).
      // The only way to start rotation again is the SET_ROTATION true
      // handler explicitly calling `_startRAFRotation`.
      // ───────────────────────────────────────────────────────────────────
      if (!this._rotationEnabled) {
        this._rafHandle = null;
        this._lastTickMs = 0;
        return;
      }
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

  private _flyTo(target: { nodeId: string }): void {
    const entity = this._entities.find(e => e.nodeId === target.nodeId);
    if (!entity) return;
    this._executeFlyTo(entity.longitude, entity.latitude, 2.8, 1800, () => {
      this._startArrivalPulse(entity.longitude, entity.latitude);
    });
  }

  /**
   * Cinematic fly-to via rAF lerp. Uses the same _selfDriving pattern as
   * auto-rotation so onViewStateChange writeback doesn't recurse.
   * FlyToInterpolator silently no-ops on _GlobeView (same issue as
   * LinearInterpolator) so we drive frames manually.
   */
  private _executeFlyTo(lng: number, lat: number, zoom: number, duration: number, onComplete?: () => void): void {
    if (!this._deck || this._status !== 'ready') return;
    if (this._flyToTimer !== null) { clearTimeout(this._flyToTimer); this._flyToTimer = null; }
    if (this._idleResumeTimer !== null) { clearTimeout(this._idleResumeTimer); this._idleResumeTimer = null; }
    this._userInteracting = true;

    const s0 = this._viewState?.longitude ?? 0;
    const s1 = this._viewState?.latitude  ?? 0;
    const s2 = this._viewState?.zoom      ?? 2;
    const t0 = performance.now();
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const tick = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const e = ease(t);
      const next = {
        ...this._viewState,
        longitude: s0 + (lng - s0) * e,
        latitude:  s1 + (lat - s1) * e,
        zoom:      s2 + (zoom - s2) * e,
      };
      this._viewState  = next;
      this._selfDriving = true;
      this._deck?.setProps({ viewState: next });
      this._selfDriving = false;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Fly-to complete. Clear the user-interaction block so future user
        // gestures can resume rotation (after IDLE_RESUME_MS via _armIdleResume).
        this._userInteracting = false;
        this._lastTickMs = 0;
        // INTENTIONALLY DO NOT call _startRAFRotation() here.
        // Rule 7: rotation lifecycle is owned ONLY by CMD.SET_ROTATION (see
        // handler comments). Restarting rotation here caused a recurring bug
        // where the globe kept rotating after the cinematic completed even
        // though an overlay was open — because SET_ROTATION false had killed
        // the RAF, but this line resurrected it. If rotation should be on
        // (no overlay), the RAF set up at init (line 263) is already alive
        // and just resumes ticking. If rotation should be off (overlay open),
        // the RAF stays dead until the overlay closes and SET_ROTATION true
        // is sent. Either way, fly-to end has no business re-enabling rotation.
        onComplete?.();
      }
    };

    requestAnimationFrame(tick);
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