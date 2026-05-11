// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ArcLayer, GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import type {
  EngineId,
  EngineInitInput,
  EngineViewInput,
  EngineFocusInput,
  EngineEntityData,
  EngineArc,
  EngineCompanySelection,
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

// Local GeoJSON — served from /public/data/. Falls back gracefully to empty
// layer if the file hasn't been deployed (non-fatal: globe still works).
const COUNTRIES_URL = '/data/countries-110m.geojson';

// Full-globe bounding polygon used by the SolidPolygonLayer ocean base.
// Slightly inside ±90 to avoid pole artifacts on globe projection.
const OCEAN_RING: [number, number][] = [
  [-180, -89.9], [180, -89.9], [180, 89.9], [-180, 89.9], [-180, -89.9],
];

// Continent → fill color for GeoJsonLayer country fills (market-based).
// Natural Earth CONTINENT values: 'Africa','Asia','Europe','North America',
// 'South America','Oceania'. 'Middle East' is a virtual continent matched
// via SUBREGION === 'Western Asia'.
const CONTINENT_FILL: Record<string, [number, number, number, number]> = {
  'Europe':        [0,   212, 170, 140],
  'North America': [255, 140,   0, 140],
  'Asia':          [255,  60,  60, 140],
  'Africa':        [255, 200,   0, 140],
  'South America': [ 68, 200, 100, 140],
  'Middle East':   [153,  85, 255, 140],
};

const COUNTRY_BASE: [number, number, number, number] = [14, 20, 38, 220];

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
  private _viewState: any = null;
  private _rafHandle: number | null = null;
  private _lastTickMs = 0;
  private _selfDriving = false;
  private _idleResumeTimer: ReturnType<typeof setTimeout> | null = null;
  private _userInteracting = false;

  private static readonly ROTATION_DEG_PER_SEC = 3;
  private static readonly IDLE_RESUME_MS = 800;

  private _focusedId: string | null = null;
  private _hoveredId: string | null = null;
  private _pendingEvents: BridgeEvent[] = [];

  // Phase 4.1: entity data received via CMD.SET_ENTITIES.
  private _entities: EngineEntityData['entities'] = [];

  // Phase 8: network arcs received via CMD.SET_ARCS.
  // _arcsRevision bumps on every commit so updateTriggers fire even when
  // arcs.length stays the same (A→B navigation with identical arc counts).
  private _arcs: EngineArc[] = [];
  private _arcsRevision = 0;

  // Phase 8+: company-selection context (markets, fabrics, selected company).
  // Null when no overlay is open. Set/cleared by CMD.SET_COMPANY_SELECTION.
  private _companySelection: EngineCompanySelection | null = null;

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

      this._viewState = { ...INITIAL_VIEW };
      this._deck = new Deck({
        canvas: this._createCanvas(input.container),
        width: resolvedW,
        height: resolvedH,
        views: new DeckGlobeView({ id: 'globe' }),
        viewState: { ...INITIAL_VIEW },
        controller: true,
        layers: this._buildLayers(),

        onViewStateChange: ({ viewState, interactionState }: any) => {
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
          if (info.layer?.id === 'globe-companies' && info.object) {
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
          }
        },

        onHover: (info: any) => {
          const hoveredNodeId = info.layer?.id === 'globe-companies' && info.object
            ? info.object.nodeId
            : null;
          if (hoveredNodeId === this._hoveredId) return;
          this._hoveredId = hoveredNodeId;
          this._emitOrBuffer({
            type: 'ENGINE.ENTITY_HOVER',
            entity: info.object && info.layer?.id === 'globe-companies' ? info.object : null,
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
      this._startRAFRotation();

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

  setView(_input: EngineViewInput): void {}

  setFocus(input: EngineFocusInput): void {
    this._focusedId = input.target?.nodeId ?? null;
    if (input.target && this._deck) {
      this._flyTo(input.target);
    }
    this._redraw();
  }

  suspend(): void {
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
    this._entities = [];
    this._arcs = [];
    this._companySelection = null;
  }

  // ---------------------------------------------------------------------------
  // IEngineBridge protocol
  // ---------------------------------------------------------------------------

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
        this._entities = command.data.entities;
        this._redraw();
        break;
      case 'CMD.SET_ARCS': {
        const incoming = command.data.arcs;
        if (this._arcs.length === 0 && incoming.length === 0) break;
        this._arcs = incoming;
        this._arcsRevision++;
        this._redraw();
        break;
      }
      case 'CMD.SET_COMPANY_SELECTION':
        this._companySelection = command.data.selection;
        this._redraw();
        break;
      case 'CMD.SET_GRAPH':
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

  private static dotColor(type: string): [number, number, number] {
    switch (type) {
      case 'PERSON':  return [0, 229, 255];   // cyan
      case 'COMPANY': return [0, 212, 170];   // teal
      case 'COUNTRY': return [245, 166, 35];  // amber
      default:        return [138, 155, 181];
    }
  }

  // Returns fill color for a Natural Earth GeoJSON feature based on which
  // market continents the selected company operates in. Middle East is matched
  // via SUBREGION === 'Western Asia' because Natural Earth classifies those
  // countries under CONTINENT === 'Asia'.
  private _countryFillColor(feature: any): [number, number, number, number] {
    const markets = this._companySelection?.marketContinents ?? [];
    if (markets.length === 0) return COUNTRY_BASE;
    const props = feature.properties ?? {};
    const continent: string = props.CONTINENT ?? '';
    const subregion: string = props.SUBREGION ?? '';

    if (markets.includes('Middle East') && subregion === 'Western Asia') {
      return CONTINENT_FILL['Middle East'];
    }
    if (continent === 'Asia'          && markets.includes('Asia'))          return CONTINENT_FILL['Asia'];
    if (continent === 'Europe'        && markets.includes('Europe'))        return CONTINENT_FILL['Europe'];
    if (continent === 'North America' && markets.includes('North America')) return CONTINENT_FILL['North America'];
    if (continent === 'Africa'        && markets.includes('Africa'))        return CONTINENT_FILL['Africa'];
    if (continent === 'South America' && markets.includes('South America')) return CONTINENT_FILL['South America'];
    return COUNTRY_BASE;
  }

  private _buildLayers() {
    const sel = this._companySelection;
    const hasSelection = sel !== null;

    // Derived arc data
    const supplierArcs = this._arcs.filter(a => a.kind === 'supplier');
    const clientArcs   = this._arcs.filter(a => a.kind === 'client');
    // Provider dots: arc source = provider location, target = focal company
    const providerPositions: [number, number][] = supplierArcs.map(a => a.source);
    // Client dots: arc source = focal company, target = client location
    const clientPositions: [number, number][]   = clientArcs.map(a => a.target);

    const fabrics = sel?.fabrics ?? [];
    const selectedPos: [number, number][] = sel
      ? [[sel.company.longitude, sel.company.latitude]]
      : [];

    const continentKey = (sel?.marketContinents ?? []).join(',');
    const selNodeId    = sel?.company.nodeId ?? '';

    return [
      // 1 — Ocean base (SolidPolygonLayer covers the full globe sphere)
      new SolidPolygonLayer({
        id: 'globe-ocean',
        data: [{ boundary: OCEAN_RING }],
        getPolygon: (d: any) => d.boundary,
        getFillColor: [4, 8, 20, 255],
        stroked: false,
      }),

      // 2 — Countries colored by company market continents
      new GeoJsonLayer({
        id: 'globe-countries',
        data: COUNTRIES_URL,
        filled: true,
        stroked: true,
        getFillColor: (f: any) => this._countryFillColor(f),
        getLineColor: [0, 229, 255, 18],
        lineWidthMinPixels: 0.4,
        updateTriggers: {
          getFillColor: [continentKey],
        },
      }),

      // 3 — All company dots (attenuated when a selection is active)
      new ScatterplotLayer({
        id: 'globe-companies',
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
          const c = GlobeBridge.dotColor(d.type);
          return [c[0], c[1], c[2], hasSelection ? 35 : 80];
        },
        getLineColor: (d: any) => {
          const c = GlobeBridge.dotColor(d.type);
          return [c[0], c[1], c[2], hasSelection && d.nodeId !== this._focusedId ? 55 : 255];
        },
        getLineWidth: (d: any) => (d.nodeId === this._focusedId ? 3 : 1.5),
        stroked: true,
        lineWidthUnits: 'pixels',
        updateTriggers: {
          getFillColor: [this._focusedId, this._hoveredId, this._entities.length, hasSelection],
          getRadius:    [this._focusedId, this._hoveredId, this._entities.length],
          getLineColor: [this._entities.length, hasSelection, this._focusedId],
          getLineWidth: [this._focusedId],
          getPosition:  [this._entities.length],
        },
      }),

      // 4 — Supplier arcs — PINK
      new ArcLayer<EngineArc>({
        id: 'globe-arcs-supplier',
        data: supplierArcs,
        pickable: false,
        greatCircle: true,
        widthUnits: 'pixels',
        getSourcePosition: (a) => a.source,
        getTargetPosition: (a) => a.target,
        getSourceColor: [232, 80, 122, 220],
        getTargetColor: [232, 80, 122, 220],
        getWidth: 2,
        getHeight: 0.2,
        updateTriggers: {
          getSourcePosition: [this._arcsRevision],
          getTargetPosition: [this._arcsRevision],
        },
      }),

      // 5 — Client arcs — PURPLE
      new ArcLayer<EngineArc>({
        id: 'globe-arcs-client',
        data: clientArcs,
        pickable: false,
        greatCircle: true,
        widthUnits: 'pixels',
        getSourcePosition: (a) => a.source,
        getTargetPosition: (a) => a.target,
        getSourceColor: [160, 100, 255, 220],
        getTargetColor: [160, 100, 255, 220],
        getWidth: 2,
        getHeight: 0.2,
        updateTriggers: {
          getSourcePosition: [this._arcsRevision],
          getTargetPosition: [this._arcsRevision],
        },
      }),

      // 6 — Provider halos — pink ring
      new ScatterplotLayer({
        id: 'globe-provider-halos',
        data: providerPositions,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 90_000,
        getFillColor: [232, 80, 122, 20],
        getLineColor: [232, 80, 122, 155],
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        updateTriggers: { getPosition: [this._arcsRevision] },
      }),

      // 7 — Client halos — purple ring
      new ScatterplotLayer({
        id: 'globe-client-halos',
        data: clientPositions,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 90_000,
        getFillColor: [160, 100, 255, 20],
        getLineColor: [160, 100, 255, 155],
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        updateTriggers: { getPosition: [this._arcsRevision] },
      }),

      // 8 — Provider dots — pink solid
      new ScatterplotLayer({
        id: 'globe-provider-dots',
        data: providerPositions,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 30_000,
        getFillColor: [232, 80, 122, 200],
        updateTriggers: { getPosition: [this._arcsRevision] },
      }),

      // 9 — Client dots — purple solid
      new ScatterplotLayer({
        id: 'globe-client-dots',
        data: clientPositions,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 30_000,
        getFillColor: [160, 100, 255, 200],
        updateTriggers: { getPosition: [this._arcsRevision] },
      }),

      // 10 — Fabric halos — amber rings, radius scales with √employees
      new ScatterplotLayer({
        id: 'globe-fabric-halos',
        data: fabrics,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius:   (d: any) => Math.max(40_000, Math.sqrt(d.employees) * 400),
        getFillColor: [245, 166, 35, 18],
        getLineColor: [245, 166, 35, 155],
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        updateTriggers: { getPosition: [selNodeId], getRadius: [selNodeId] },
      }),

      // 11 — Fabric dots — amber solid, radius scales with √employees
      new ScatterplotLayer({
        id: 'globe-fabric-dots',
        data: fabrics,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius:   (d: any) => Math.max(15_000, Math.sqrt(d.employees) * 150),
        getFillColor: [245, 166, 35, 200],
        updateTriggers: { getPosition: [selNodeId], getRadius: [selNodeId] },
      }),

      // 12 — Selected company glow halo — cyan 300k m
      new ScatterplotLayer({
        id: 'globe-selected-halo',
        data: selectedPos,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 300_000,
        getFillColor: [0, 229, 255, 14],
        getLineColor: [0, 229, 255, 135],
        stroked: true,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        updateTriggers: { getPosition: [selNodeId] },
      }),

      // 13 — Selected company solid dot — cyan 120k m (topmost)
      new ScatterplotLayer({
        id: 'globe-selected-dot',
        data: selectedPos,
        pickable: false,
        radiusUnits: 'meters',
        getPosition: (d: [number, number]) => d,
        getRadius: 120_000,
        getFillColor: [0, 229, 255, 220],
        updateTriggers: { getPosition: [selNodeId] },
      }),
    ];
  }

  private _redraw(): void {
    this._deck?.setProps({ layers: this._buildLayers() });
  }

  // ---------------------------------------------------------------------------
  // Private — auto-rotation (Phase 7.3g, rAF + writeback) + flyTo (stub)
  // ---------------------------------------------------------------------------

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

  private _armIdleResume(): void {
    if (this._idleResumeTimer !== null) {
      clearTimeout(this._idleResumeTimer);
    }
    this._idleResumeTimer = setTimeout(() => {
      this._idleResumeTimer = null;
      this._userInteracting = false;
      this._lastTickMs = 0;
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

  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) {
      this._emit(event);
    } else {
      this._pendingEvents.push(event);
    }
  }
}
