// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ArcLayer, GeoJsonLayer, IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
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
import { geoCluster, clusterThresholdKm, type Cluster } from './geoCluster';
import { aggregateArcs, type AggregatedArc } from './aggregateArcs';
import { getSpiderfyOffsets } from './spiderfy';

// Day 4+: declutter algorithm has gone through FOUR shapes; this file
// imports the latest. The history is preserved here because each step is a
// real tradeoff worth keeping documented.
//
//   v1  entitySpread.ts (geographic spread, deleted)
//       Stored `displayLat/displayLng` (cluster-offset, real HQ lost) on the
//       entity model. Arcs needed `_resolveArcsToDisplay()` to rebind to
//       the spread coords. Spread was 200/340/480 km rings — too aggressive
//       at high zoom (cluster members across an ocean). Stable in time, bad
//       at adapting to zoom.
//
//   v2  screenDeclutter.ts (screen-space, deleted)
//       viewport.project every entity every frame, bbox-overlap to find
//       collision groups, unproject the offset back to lat/lng for the
//       Scatterplot layers. Adaptive at any zoom. BUT: on _GlobeView the
//       projection changes per frame during rotation, so collision groups
//       formed and dissolved continuously and the deterministic-by-id sort
//       reassigned grid slots → icons visibly "danced". Plus
//       viewport.unproject near the limb returned garbage lat/lng. Killed.
//
//   v3  pixelSpread.ts (hybrid, deleted)
//       Union-find geographic clustering at 50 km + per-cluster pixel
//       offsets. Stable in time, no viewport.unproject. BUT: at low zoom
//       the spread radius (32-80 px) was still tiny vs the typical 24 px
//       icon size, so visually identical icons ("logo wars" — three near-
//       overlapping Apple/Google/Meta logos in the Bay Area). Decluttering
//       at low zoom is fundamentally information loss masquerading as
//       cleanliness. User rejected.
//
//   v4  geoCluster.ts + spiderfy.ts + aggregateArcs.ts (this file)
//       SEMANTIC CLUSTERING. Replace "render every entity, declutter
//       visually" with "render N cluster badges + count, expand on click".
//       At zoom 2 the Bay Area becomes ONE "[6] Bay Area" badge with
//       aggregated arc thickness. Click the badge → spiderfy children in
//       a multi-ring pattern around the cluster centroid; click outside
//       → collapse. Arcs aggregate to cluster→cluster pairs while
//       collapsed, switch to individual entity arcs while expanded.
//
// Consequences for the layers downstream (v4):
//   - cluster-badges IconLayer: one icon per cluster at centroid. Icon
//     is the dominant entity's logo (companies) or a generic colored disc
//     (PERSON/COUNTRY-dominant). Pickable; click toggles expansion or
//     fires ENTITY_CLICK on singletons.
//   - cluster-labels TextLayer: shows "+N · ISO2" sublabel when count>1.
//     Anchored ABOVE the cluster badge (-26 px Y offset, so it never
//     overlaps the icon).
//   - cluster-rings ScatterplotLayer: pickable HQ ring at REAL HQ for
//     singletons / at cluster centroid for multi-clusters. Same dynamic
//     radius as v3 globe-rings. Kept for picking parity (clicks on the
//     glow ring still register, useful when the user's cursor is slightly
//     off the small logo).
//   - spiderfy-icons IconLayer (only while expanded): renders the
//     expanded cluster's children at cluster centroid + per-child pixel
//     offset from spiderfy.ts. Pickable; click fires ENTITY_CLICK on
//     that specific child.
//   - aggregated-arcs ArcLayer (while collapsed): one arc per cluster
//     pair, width = base + k·√Σintensity (see aggregateArcs.ts).
//   - individual-arcs ArcLayer (while expanded): the original per-
//     entity arcs, filtered to those touching the expanded cluster's
//     children (or all, depending on density).

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_VIEW = { longitude: 20, latitude: 25, zoom: 2, minZoom: 0, maxZoom: 5 };

// Local GeoJSON in /public/data — no network round-trip on startup.
// Layer renders empty if the file is missing (non-fatal: globe still works).
const COUNTRIES_URL = '/data/countries-110m.geojson';

// v4: generic disc used by IconLayer when an entity has no `iconUrl`
// (PERSON, COUNTRY, or COMPANY entities without a logo asset). White
// circle on transparent background — the `mask: true` flag on IconLayer's
// getIcon return value tells deck.gl to multiply the white pixels by
// `getColor` so we can recolor it per entity type at draw time. SVG is
// rasterized once by deck.gl and cached in the texture atlas.
const GENERIC_DOT_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="13" fill="white"/>' +
    '</svg>',
  );

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

  private static readonly ROTATION_DEG_PER_SEC = 1;
  private static readonly IDLE_RESUME_MS = 800;

  // Day 4+ (visual): arc palette updated to GREEN (suppliers) and WHITE
  // (clients). Suppliers feed in → green reads as "incoming flow / stable
  // input"; clients are outbound revenue → cool white reads as "neutral
  // commercial relationship". Connection + partner kinds keep their accent
  // colors (cyan/amber) — they're used for power-map edges, not company
  // network. To swap supplier↔client palette, exchange the two RGB tuples
  // below; layer code reads through the same accessors regardless.
  // Width clamps are pixels at any zoom (widthUnits: 'pixels' on the layer).
  private static readonly ARC_COLOR_SUPPLIER:   [number, number, number] = [110, 220, 140]; // green
  private static readonly ARC_COLOR_CLIENT:     [number, number, number] = [240, 244, 250]; // off-white
  private static readonly ARC_COLOR_CONNECTION: [number, number, number] = [0,   229, 255];
  private static readonly ARC_COLOR_PARTNER:    [number, number, number] = [245, 166, 35];
  private static readonly ARC_WIDTH_MIN = 1;
  private static readonly ARC_WIDTH_MAX = 4;

  private _focusedId: string | null = null;
  // True while a fly-to initiated by an entity click (not CMD.FLY_TO) is in
  // flight. Prevents CMD.SET_ROTATION false (which arrives ~50ms after the
  // click via URL change) from cancelling the cinematic via _flyToCancelled.
  private _flyToEntityClick = false;
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

  // Phase 4.1 / Day 4+ v4: raw entity data received via CMD.SET_ENTITIES.
  // Untouched — longitude/latitude are REAL HQ coords from the mapper. The
  // cluster engine (geoCluster) reads this array; we never mutate elements.
  private _rawEntities: EngineEntityData['entities'] = [];

  // v4: derived cluster set. Recomputed when raw entities change (CMD.SET_
  // ENTITIES) or when the zoom step crosses a threshold boundary (handled by
  // _maybeRecluster in onViewStateChange). `_clusterThresholdKm` tracks the
  // last threshold used as a cache key — if the current view's threshold
  // matches, we reuse `_clusters` without recomputing.
  private _clusters: Cluster[] = [];
  private _clusterThresholdKm = -1;

  // v4: aggregated arcs per (sourceClusterId, targetClusterId). Recomputed
  // whenever clusters OR raw arcs change. Used by the aggregated-arcs layer
  // when no cluster is expanded.
  private _aggArcs: AggregatedArc[] = [];

  // v4: cluster currently spiderfy-expanded. null = all clusters collapsed.
  // Cleared on: background click, click on a different cluster, zoom step
  // change (when the expanded cluster might merge/split), CMD.SET_ENTITIES
  // (data revision). NOT cleared on overlay open (per spec — let the user
  // see what they expanded behind the overlay).
  private _expandedClusterId: string | null = null;

  // Phase 8: network arcs received via CMD.SET_ARCS.
  // Fed into individual-arcs ArcLayer (when a cluster is expanded) or via
  // aggregateArcs into the aggregated-arcs layer (when all collapsed).
  // _arcsRevision is a monotonic counter used in updateTriggers — bumps
  // every commit even when arcs.length stays the same so deck.gl re-
  // evaluates accessors. Using .length alone misses A→B navigation cases.
  private _arcs: EngineArc[] = [];
  private _arcsRevision = 0;

  private _activePowerMapId: string | null = null;
  private _pmEntities: PowerMapEntity[] = [];
  private _pmEdges:    PowerMapEdge[]    = [];
  private _rotationEnabled = true;
  private _flyToTimer: ReturnType<typeof setTimeout> | null = null;
  // Rule 7 hardening: CMD.SET_ROTATION { enabled: false } flips this to true.
  // The fly-to tick reads it each frame and aborts if set. `_executeFlyTo`
  // resets it to false on entry so a NEW fly-to dispatched AFTER a
  // SET_ROTATION false (e.g. powermap order: SET_POWERMAP → SET_ROTATION →
  // FLY_TO) can run to completion. Entity-click fly-tos started from
  // `onClick` lose this race intentionally (the rotation-stop chain
  // dispatches SET_ROTATION false ~50ms after the click) — the globe
  // freezes immediately on entity selection instead of panning for 1.8s.
  private _flyToCancelled = false;

  // Arrival pulse — single expanding gold ring when fly-to completes.
  private _arrivalCoords: [number, number] | null = null;
  private _arrivalAnimStart = 0;
  private _arrivalAnimRAF: number | null = null;

  // Idle pulse no-op scaffold — _startIdlePulse / _stopIdlePulse are
  // called from CMD.SET_ROTATION true/false respectively, but the interval
  // currently runs as a tick-only loop (no rendering). Kept as a lifecycle
  // hook for a future Phase 8+ idle-arcs animation; remove if not used by
  // end of Sprint 3.
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
        pickingRadius: 8,
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
            // v4: even on self-driven frames (rAF rotation, fly-to lerp) we
            // need to check if zoom crossed a cluster-threshold boundary;
            // _maybeRecluster bails cheaply when no change.
            this._maybeRecluster();
            return;
          }
          this._viewState = viewState;
          this._deck?.setProps({ viewState });
          this._maybeRecluster();
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

        // Cursor: pointer when hovering a pickable entity, grabbing while
        // panning, grab otherwise. deck.gl computes `isHovering` from the
        // pick buffer — true whenever the mouse is over a layer with
        // pickable:true (cluster-rings, cluster-badges, spiderfy-icons,
        // globe-pm-rings).
        getCursor: ({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab',

        // Hover tooltip: small glass chip. deck.gl positions it
        // automatically near the cursor. Content varies by layer:
        //   - cluster-rings / cluster-badges  → cluster.label (+ sublabel if multi)
        //   - spiderfy-icons                  → individual entity name
        //   - globe-pm-rings                  → powermap entity name
        // Plain text to avoid XSS — deck.gl renders `text` as innerText.
        getTooltip: (info: any) => {
          const id = info.layer?.id;
          if (!info.object) return null;
          let text: string | null = null;
          if (id === 'globe-cluster-rings' || id === 'globe-cluster-badges') {
            const c = info.object as Cluster;
            text = c.isSingleton
              ? c.dominantEntity.name
              : `${c.label} ${c.sublabel}`.trim();
          } else if (id === 'globe-spiderfy-icons') {
            text = info.object.name ?? null;
          } else if (id === 'globe-pm-rings') {
            text = info.object.name ?? info.object.label ?? null;
          }
          if (!text) return null;
          return {
            text,
            style: {
              background: 'rgba(4, 8, 16, 0.92)',
              color: '#e8edf5',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: '6px',
              padding: '6px 10px',
              font: '500 12px/1.2 system-ui, -apple-system, sans-serif',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            },
          };
        },

        onClick: (info: any) => {
          // v4: cluster-aware click routing.
          //
          //   - cluster-badges / cluster-rings hit:
          //       * singleton (count=1): treat like the v3 entity click —
          //         fly to the dominant entity + emit ENTITY_CLICK +
          //         click-ripple. No state change to _expandedClusterId.
          //       * multi-cluster: TOGGLE expansion. Clicking the currently
          //         expanded cluster collapses it; clicking a different
          //         cluster while one is expanded switches expansion to the
          //         new cluster (which implicitly collapses the previous).
          //   - spiderfy-icons hit (only present while expanded):
          //         fly + ENTITY_CLICK on that specific child. The
          //         _expandedClusterId is NOT cleared — the overlay opens
          //         on top of the expanded view (per spec).
          //   - Anything else (background, country fill, base globe):
          //         if a cluster is currently expanded, collapse it. This
          //         is the "click outside to dismiss" gesture.
          const id = info.layer?.id;

          if ((id === 'globe-cluster-badges' || id === 'globe-cluster-rings') && info.object) {
            const cluster = info.object as Cluster;
            if (cluster.isSingleton) {
              const entity = cluster.dominantEntity;
              this._flyTo({ nodeId: entity.nodeId });
              this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity });
              this._startClickAnim(entity);
            } else {
              const next = this._expandedClusterId === cluster.id ? null : cluster.id;
              this._expandedClusterId = next;
              this._redraw();
            }
            return;
          }

          if (id === 'globe-spiderfy-icons' && info.object) {
            const entity = info.object;
            this._flyTo({ nodeId: entity.nodeId });
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity });
            this._startClickAnim(entity);
            return;
          }

          // Background click — collapse if anything is expanded.
          if (this._expandedClusterId !== null) {
            this._expandedClusterId = null;
            this._redraw();
          }
        },

        onHover: (info: any) => {
          // v4: pickable layers are cluster-badges, cluster-rings,
          // spiderfy-icons, globe-pm-rings. Hover id semantics:
          //   - cluster hit → use cluster.id (already prefixed "cluster:...")
          //   - spiderfy child / pm-rings hit → use entity nodeId/id
          // The two namespaces never collide because cluster ids start with
          // "cluster:". The hover ripple system + tooltip layer both read
          // _hoveredId and dispatch differently based on the prefix.
          const layerId = info.layer?.id;
          const isClusterLayer =
            layerId === 'globe-cluster-rings' || layerId === 'globe-cluster-badges';
          const isEntityLayer =
            layerId === 'globe-spiderfy-icons' || layerId === 'globe-pm-rings';
          let hoveredNodeId: string | null = null;
          if (isClusterLayer && info.object) {
            hoveredNodeId = (info.object as Cluster).id;
          } else if (isEntityLayer && info.object) {
            hoveredNodeId = info.object.nodeId ?? info.object.id ?? null;
          }
          if (hoveredNodeId === this._hoveredId) return;

          const wasHoveringPin = this._hoveredId !== null;
          this._hoveredId      = hoveredNodeId;

          // ─── Pin pause: freeze rotation while the cursor is on a pickable ──
          //
          // Rationale: auto-rotation runs at 1 deg/sec. At zoom 2 that means
          // ~22 km of equatorial pin drift per 200 ms — roughly the *entire*
          // dynamic picking radius (~24 screen-px ≈ 30-120 km depending on
          // zoom). So the empirical sequence was:
          //   1. cursor enters a pin → hover fires → cursor becomes "pointer"
          //   2. user takes ~200 ms to mouse-down
          //   3. globe rotated meanwhile, pin moved ~22 km
          //   4. click hits empty space, `info.object` is undefined, `onClick`
          //      bails silently → "the cursor turned into a hand but nothing
          //      happens".
          //
          // Fix: when hover transitions empty→pin, set `_userInteracting=true`
          // (same flag onViewStateChange uses for drag/wheel). The rotation RAF
          // tick keeps running but skips the setProps step, so the pin is
          // visually stationary. When hover transitions pin→empty, arm the
          // standard idle resume timer (800 ms) just like a drag would — gives
          // the user a moment to re-enter a neighbour without flashing into
          // motion.
          //
          // Why not _stopRAFRotation()? Because the rotation RAF is the
          // single-source-of-truth loop owned by CMD.SET_ROTATION (see Rule 7
          // in the rotation handler). Stopping it here would conflict with the
          // lifecycle invariant. Toggling `_userInteracting` is the cheap pause
          // that doesn't fight Rule 7.
          if (hoveredNodeId !== null && !wasHoveringPin) {
            if (this._idleResumeTimer !== null) {
              clearTimeout(this._idleResumeTimer);
              this._idleResumeTimer = null;
            }
            this._userInteracting = true;
          } else if (hoveredNodeId === null && wasHoveringPin) {
            // Only re-arm idle resume if rotation is currently allowed by
            // Rule 7 (an open overlay keeps `_rotationEnabled=false` and the
            // RAF dead — no need to arm a resume that will be a no-op).
            if (this._rotationEnabled) this._armIdleResume();
          }

          // v4: ENGINE.ENTITY_HOVER carries an EntityRef-shaped object. For
          // cluster-rings/cluster-badges hits we forward the cluster's
          // DOMINANT entity (lets the receiver — typically a Workstation
          // search-results highlight — react to "this cluster contains BMW
          // among others" without UI for clusters yet). For spiderfy hits
          // we forward the specific child. Hover-out → null.
          let hoverEntity: any = null;
          if (info.object) {
            if (info.layer?.id === 'globe-cluster-rings' || info.layer?.id === 'globe-cluster-badges') {
              hoverEntity = (info.object as Cluster).dominantEntity;
            } else if (info.layer?.id === 'globe-spiderfy-icons') {
              hoverEntity = info.object;
            }
          }
          this._emitOrBuffer({ type: 'ENGINE.ENTITY_HOVER', entity: hoverEntity });
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
    this._rawEntities = [];
    this._clusters = [];
    this._aggArcs = [];
    this._expandedClusterId = null;
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
        // v4: store raw entities verbatim, then derive clusters via
        // geoCluster. The cluster set is the new "render unit" — every
        // visible-globe layer reads from `_clusters` now, not from raw
        // entities directly.
        //
        // Data revision: when entity content changes, the previously
        // expanded cluster's id is no longer guaranteed to exist. Reset
        // _expandedClusterId so we don't try to expand a phantom cluster.
        this._rawEntities = command.data.entities;
        this._expandedClusterId = null;
        this._recluster();
        this._reaggregateArcs();
        this._redraw();
        break;
      case 'CMD.SET_ARCS': {
        // Short-circuit: incoming and current both empty → no rebuild. Prevents
        // redundant layer churn on repeated CLOSE_OVERLAY dispatches and on
        // initial mount when no overlay is open.
        const incoming = command.data.arcs;
        if (this._arcs.length === 0 && incoming.length === 0) break;
        // v4: store raw arcs; aggregate into cluster→cluster arcs. When
        // a cluster is expanded, the individual-arcs layer reads from
        // _arcs directly (filtered to that cluster's children); when
        // collapsed, the aggregated-arcs layer reads from _aggArcs.
        this._arcs = incoming;
        this._arcsRevision++;
        this._reaggregateArcs();
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
          // Hard-stop rotation. Rule 7 invariant: rotation MUST freeze when an
          // entity is selected or atlasView leaves 'globe'.
          // Exception: if _flyToEntityClick is true, the cinematic was started by
          // an entity click and SET_ROTATION false arrived ~50ms later via URL
          // change. Allow the cinematic to complete so the globe actually flies
          // to the selected entity. The fly-to callback resets _flyToEntityClick.
          this._stopRAFRotation();
          if (this._idleResumeTimer !== null) {
            clearTimeout(this._idleResumeTimer);
            this._idleResumeTimer = null;
          }
          this._userInteracting = true; // belt-and-braces
          if (!this._flyToEntityClick) {
            this._flyToCancelled = true; // freeze in-flight cinematic (powermap/CMD.FLY_TO)
          }
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

  // v4: rebuild the cluster set from raw entities at the current zoom's
  // threshold. Called whenever entities change (CMD.SET_ENTITIES) or zoom
  // crosses a threshold boundary (_maybeRecluster). After clustering, agg
  // arcs MUST also be rebuilt (entity → cluster mapping changed).
  //
  // Idempotent — calling twice with the same inputs is harmless.
  private _recluster(): void {
    const zoom = this._viewState?.zoom ?? INITIAL_VIEW.zoom;
    const threshold = clusterThresholdKm(zoom);
    this._clusters = geoCluster(this._rawEntities as any, { zoom });
    this._clusterThresholdKm = threshold;
  }

  // v4: recompute aggregated arcs from the current (_arcs, _clusters) pair.
  // Called any time either side changes. Pure function so no extra state
  // to track.
  private _reaggregateArcs(): void {
    this._aggArcs = aggregateArcs(this._arcs, this._clusters);
  }

  // v4: cheap zoom-threshold check called from onViewStateChange every
  // frame. The threshold curve is a 4-step ladder (80/40/20/8 km) so the
  // check usually short-circuits to "no change". When it does fire, the
  // O(n²) union-find at iPM scale is ~0.1 ms — fine inside a render frame.
  // After reclustering we also need to re-aggregate arcs (cluster ids may
  // have changed) and validate _expandedClusterId still exists.
  private _maybeRecluster(): void {
    const zoom = this._viewState?.zoom ?? INITIAL_VIEW.zoom;
    const threshold = clusterThresholdKm(zoom);
    if (threshold === this._clusterThresholdKm) return;
    this._recluster();
    this._reaggregateArcs();
    if (
      this._expandedClusterId !== null &&
      !this._clusters.some((c) => c.id === this._expandedClusterId)
    ) {
      // Expanded cluster ceased to exist after threshold change (split or
      // merged). Spec: reset on zoom-threshold change.
      this._expandedClusterId = null;
    }
  }

  // v4: returns the camera-facing clusters. The threshold (-0.1 ≈ 96°)
  // lets clusters a little past the limb still render — useful for arcs
  // that anchor outside the strict 90° hemisphere but whose visible body
  // is still inside.
  private _computeVisibleClusters(): Cluster[] {
    const vs = this._viewState ?? INITIAL_VIEW;
    const camLat = (vs.latitude  ?? 0) * Math.PI / 180;
    const camLng = (vs.longitude ?? 0) * Math.PI / 180;
    const cx = Math.cos(camLat) * Math.cos(camLng);
    const cy = Math.cos(camLat) * Math.sin(camLng);
    const cz = Math.sin(camLat);
    const THRESHOLD = -0.1;
    return this._clusters.filter((c) => {
      const lat = c.lat * Math.PI / 180;
      const lng = c.lng * Math.PI / 180;
      return (cx * Math.cos(lat) * Math.cos(lng) +
              cy * Math.cos(lat) * Math.sin(lng) +
              cz * Math.sin(lat)) > THRESHOLD;
    });
  }

  // v4: returns the non-animated layers (base, countries, arcs, cluster
  // rings, powermap). Cluster icons + spiderfy live in _buildAnimatedLayers
  // because they need to be drawn LAST (on top of everything else).
  //
  // No cache. Previous versions tried to cache static layers by a key like
  // (focused, hovered, powermap, arcsRev, visibleCount, round(zoom),
  // round(lat)), but it always grew a hidden invalidation bug. At iPM
  // scale (~50 entities, ~10 layer objects) the per-redraw cost is well
  // inside the 16 ms frame budget. If we ever need caching, the right
  // unit is by-cluster-set reference equality, not viewState.
  private _buildStaticLayers(visibleClusters: Cluster[]): any[] {
    return this._buildStaticLayersImpl(visibleClusters);
  }

  private _buildStaticLayersImpl(visibleClusters: Cluster[]) {
    // Idle skin — dark navy continents with visible borders.
    const IDLE_FILL:   [number,number,number,number] = [18, 54, 105, 255];
    const IDLE_STROKE: [number,number,number,number] = [55, 120, 190, 140];
    const pmCfg = this._activePowerMapId ? POWER_MAP_CONFIGS[this._activePowerMapId] : undefined;

    // Dynamic picking radius — keeps the hit circle at ~24 screen-px regardless
    // of zoom. Prevents the focused entity's disc from blocking adjacent picks
    // post fly-to (zoom 2.8 → 120km ≈ 90px without this, leaving only ~32px
    // margin for neighbours). Clamped [30k, 120k] m so it degrades gracefully
    // at very high or very low zoom.
    const SCREEN_TARGET_PX = 24;
    const EARTH_C          = 40_075_000;
    const _zoom            = this._viewState?.zoom     ?? INITIAL_VIEW.zoom;
    const _lat             = this._viewState?.latitude ?? INITIAL_VIEW.latitude;
    const metersPerPx      = (EARTH_C * Math.cos(_lat * Math.PI / 180)) / Math.pow(2, _zoom + 8);
    const dynamicRadius    = Math.max(30_000, Math.min(120_000, SCREEN_TARGET_PX * metersPerPx));

    // v4: clusters containing the focused entity are pushed to the END of
    // the picking array so neighbour clusters win on overlap (same logic
    // as v3 globe-rings but at the cluster granularity). Background:
    // parameters.depthTest=false means LAST fragment wins picking; with
    // focused first, focused-adjacent picks were impossible.
    const orderedClusters = this._focusedId
      ? [
          ...visibleClusters.filter((c) => c.dominantEntity.nodeId !== this._focusedId),
          ...visibleClusters.filter((c) => c.dominantEntity.nodeId === this._focusedId),
        ]
      : visibleClusters;

    // v4: arc-layer routing — when a cluster is expanded, render the
    // INDIVIDUAL underlying arcs (so the user sees BMW → Allianz precisely,
    // not "Munich → Frankfurt [12]"); when collapsed, render the
    // AGGREGATED arcs. The two layers are mutually exclusive at any moment
    // — we pass an empty `data` to the non-active one so deck.gl simply
    // doesn't render anything. Cheaper than constructing/unconstructing
    // the layer object across frames (deck.gl re-uses layer instances
    // across setProps when ids match).
    const isExpanded = this._expandedClusterId !== null;

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
      switch (type.toUpperCase()) {
        case 'PERSON':  return [255, 210, 0, 220];                                  // gold
        case 'COMPANY': return isGold ? [0, 255, 248, 240] : [0, 229, 255, 220]; // bright cyan : cyan
        case 'COUNTRY': return [245, 166, 35, 220];
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
      // v4: globe-arcs-aggregated — one arc per (sourceCluster, targetCluster)
      // pair, anchored at cluster CENTROIDS. Visible only while NO cluster
      // is expanded. Width = base + k·√Σintensity (see aggregateArcs.ts).
      // Color follows the dominant kind in the underlying group (most-
      // frequent of supplier/client/partner/connection).
      new ArcLayer<AggregatedArc>({
        id: 'globe-arcs-aggregated',
        data: isExpanded ? [] : this._aggArcs,
        pickable: false,
        greatCircle: true,
        widthUnits: 'pixels',
        getSourcePosition: (a) => a.source,
        getTargetPosition: (a) => a.target,
        getSourceColor: (a) => {
          const c = a.dominantKind === 'supplier'   ? GlobeBridge.ARC_COLOR_SUPPLIER
                  : a.dominantKind === 'client'     ? GlobeBridge.ARC_COLOR_CLIENT
                  : a.dominantKind === 'connection' ? GlobeBridge.ARC_COLOR_CONNECTION
                  :                                  GlobeBridge.ARC_COLOR_PARTNER;
          return [c[0], c[1], c[2], 220];
        },
        getTargetColor: (a) => {
          const c = a.dominantKind === 'supplier'   ? GlobeBridge.ARC_COLOR_SUPPLIER
                  : a.dominantKind === 'client'     ? GlobeBridge.ARC_COLOR_CLIENT
                  : a.dominantKind === 'connection' ? GlobeBridge.ARC_COLOR_CONNECTION
                  :                                  GlobeBridge.ARC_COLOR_PARTNER;
          return [c[0], c[1], c[2], 220];
        },
        getWidth: (a) => a.width,
        getHeight: 0.2,
        updateTriggers: {
          data:              [this._arcsRevision, this._expandedClusterId, this._clusters.length],
          getSourcePosition: [this._arcsRevision, this._clusters.length],
          getTargetPosition: [this._arcsRevision, this._clusters.length],
          getSourceColor:    [this._arcsRevision],
          getTargetColor:    [this._arcsRevision],
          getWidth:          [this._arcsRevision],
        },
      }),
      // v4: globe-arcs-individual — original per-entity arcs (from
      // CMD.SET_ARCS), visible ONLY while a cluster is expanded. Filtered
      // to arcs whose source OR target sits in the currently expanded
      // cluster — keeps the visual focus on the user's choice and avoids
      // re-clutter from arcs between collapsed clusters.
      new ArcLayer<EngineArc>({
        id: 'globe-arcs-individual',
        data: isExpanded ? this._filterArcsForExpandedCluster() : [],
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
          data:              [this._arcsRevision, this._expandedClusterId],
          getSourcePosition: [this._arcsRevision],
          getTargetPosition: [this._arcsRevision],
          getSourceColor:    [this._arcsRevision],
          getTargetColor:    [this._arcsRevision],
          getWidth:          [this._arcsRevision],
        },
      }),
      // v4: globe-selected-halo — cyan ring around focused entity's
      // CLUSTER centroid. Anchored to cluster.lat/lng (which equals real
      // HQ for singletons and metro/mean centroid for multi-clusters).
      // 300 km radius comfortably encloses the cluster badge + spiderfy
      // pixel offsets (≤150 px at typical zoom).
      new ScatterplotLayer<Cluster>({
        id: 'globe-selected-halo',
        data: this._focusedId
          ? visibleClusters.filter((c) => c.dominantEntity.nodeId === this._focusedId)
          : [],
        pickable: false,
        radiusUnits: 'meters',
        getPosition:  (c) => [c.lng, c.lat],
        getRadius:    300_000,
        getFillColor: [0, 0, 0, 0],
        getLineColor: [0, 229, 255, 200],
        getLineWidth: 2,
        stroked: true,
        lineWidthUnits: 'pixels',
        updateTriggers: {
          data: [this._focusedId, visibleClusters.length],
        },
      }),
      // v4: globe-cluster-rings — pickable ring around each cluster's
      // centroid. Visible at all times; click toggles expansion (multi-
      // clusters) or fires ENTITY_CLICK (singletons). Same dynamic-radius
      // logic as v3 globe-rings to keep the hit area at ~24 screen-px
      // independent of zoom.
      //
      // Color: dominantEntity.type drives the ring color (COMPANY = cyan,
      // PERSON = gold, COUNTRY = orange). This is consistent with v3 dot
      // coloring — a cluster of 5 Munich companies reads "cyan cluster".
      // The selected/hovered cases use cluster.id (multi) or dominant's
      // nodeId (singleton) as the comparison key (see _hoveredId routing).
      new ScatterplotLayer<Cluster>({
        id: 'globe-cluster-rings',
        data: orderedClusters,
        pickable: true,
        parameters: { depthTest: false } as any,
        radiusUnits: 'meters',
        getPosition:  (c) => [c.lng, c.lat],
        getRadius:    dynamicRadius,
        getFillColor: (c) => {
          // Selected (clicked / focused via overlay): bright cyan glow.
          if (c.dominantEntity.nodeId === this._focusedId) return [0, 229, 255, 80];
          // Hovered: white wash. _hoveredId carries cluster.id for multi-
          // clusters and entity.nodeId for spiderfy children — compare to
          // both for cluster-level hover feedback.
          if (c.id === this._hoveredId) return [255, 255, 255, 180];
          const col = dotColor(c.dominantEntity.type, c.dominantEntity.isGold);
          return [col[0], col[1], col[2], 80];
        },
        getLineColor: (c) => {
          const col = dotColor(c.dominantEntity.type, c.dominantEntity.isGold);
          return [col[0], col[1], col[2], 255];
        },
        getLineWidth: (c) => (c.dominantEntity.nodeId === this._focusedId ? 3 : 1.5),
        stroked: true,
        lineWidthUnits: 'pixels',
        updateTriggers: {
          getFillColor: [this._focusedId, this._hoveredId, visibleClusters.length],
          getLineColor: [visibleClusters.length],
          getLineWidth: [this._focusedId],
          getPosition:  [visibleClusters],
          getRadius:    [_zoom, _lat],
        },
      }),
      // v4: globe-cluster-dots — decorative inner fill that reads through
      // the ring's translucent fill. Only for clusters whose dominant entity
      // has NO iconUrl (PERSON, COUNTRY, or COMPANY without logo). When a
      // logo is available, the cluster badge IconLayer (in
      // _buildAnimatedLayers) provides the visual identity instead.
      new ScatterplotLayer<Cluster>({
        id: 'globe-cluster-dots',
        data: visibleClusters.filter((c) => !c.dominantEntity.iconUrl),
        pickable: false,
        radiusUnits: 'meters',
        getPosition:  (c) => [c.lng, c.lat],
        getRadius:    30_000,
        getFillColor: (c) => {
          const col = dotColor(c.dominantEntity.type, c.dominantEntity.isGold);
          return [col[0], col[1], col[2], 200];
        },
        updateTriggers: {
          getFillColor: [visibleClusters.length],
          getPosition:  [visibleClusters],
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
    ];
  }

  // v4: animated layers + cluster badges + spiderfy. All drawn AFTER the
  // static layers so they end up on top in both the visual buffer and
  // the pick buffer (with depthTest:false the LAST fragment wins).
  //
  // Layer set:
  //   - arrival-pulse  (ScatterplotLayer)  fly-to landing ring
  //   - click-ripple-* (ScatterplotLayer)  triple expanding rings on click
  //   - cluster-badges (IconLayer)         dominant entity's logo per cluster
  //   - cluster-labels (TextLayer)         "+N · ISO2" sublabel for multi-clusters
  //   - spiderfy-icons (IconLayer)         expanded cluster's children at
  //                                        cluster centroid + pixel offsets
  private _buildAnimatedLayers(visibleClusters: Cluster[]): any[] {
    // Resolve the expanded cluster (if any) and precompute child offsets.
    // Hoisted outside the layer literal so we don't run getSpiderfyOffsets
    // twice (once for the data array, once if we ever inspect counts).
    const expandedCluster = this._expandedClusterId
      ? visibleClusters.find((c) => c.id === this._expandedClusterId) ?? null
      : null;
    type SpiderfyChild = EngineEntityData['entities'][number] & {
      _pxX: number;
      _pxY: number;
      _clusterLng: number;
      _clusterLat: number;
    };
    const spiderfyChildren: SpiderfyChild[] = expandedCluster
      ? (() => {
          const offsets = getSpiderfyOffsets(expandedCluster.count);
          return expandedCluster.children.slice(0, offsets.length).map((child, i) => ({
            ...child,
            _pxX: offsets[i].dx,
            _pxY: offsets[i].dy,
            _clusterLng: expandedCluster.lng,
            _clusterLat: expandedCluster.lat,
          })) as SpiderfyChild[];
        })()
      : [];

    return [
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

      // v4: globe-cluster-badges — one IconLayer item per cluster. The icon
      // is the dominant entity's logo when available (COMPANY with iconUrl),
      // otherwise a generic colored dot (PERSON gold, COUNTRY orange). The
      // expanded cluster's badge is hidden because the spiderfy children
      // visually replace it (we don't want a redundant "BMW" icon on top of
      // the spiderfy BMW dot).
      //
      // billboard: true keeps sprites camera-facing on _GlobeView.
      // depthTest: false prevents the globe sphere from z-clipping the sprite
      // AND ensures this layer wins picking over the cluster-rings beneath.
      new IconLayer<Cluster>({
        id: 'globe-cluster-badges',
        data: visibleClusters.filter((c) => c.id !== this._expandedClusterId),
        pickable: true,
        billboard: true,
        parameters: { depthTest: false } as any,
        getPosition: (c) => [c.lng, c.lat],
        getIcon: (c) => {
          const d = c.dominantEntity;
          if (d.iconUrl) {
            return { url: d.iconUrl, width: 64, height: 64, anchorX: 32, anchorY: 32, mask: false };
          }
          // Mask SVG — getColor will tint it (deck.gl multiplies white pixels by getColor).
          return { url: GENERIC_DOT_DATA_URL, width: 32, height: 32, anchorX: 16, anchorY: 16, mask: true };
        },
        getColor: (c) => {
          // Only used when the icon is the GENERIC_DOT_DATA_URL (mask:true).
          // For real iconUrls deck.gl ignores getColor (mask:false).
          const t = c.dominantEntity.type.toUpperCase();
          if (t === 'PERSON')  return [255, 210, 0, 240];
          if (t === 'COUNTRY') return [245, 166, 35, 240];
          return [0, 229, 255, 240];
        },
        // Slightly larger when hovered or when the cluster contains the
        // focused entity — gives visual feedback parallel to the ring's
        // fill change.
        getSize: (c) => {
          if (c.dominantEntity.nodeId === this._focusedId) return 34;
          if (c.id === this._hoveredId) return 32;
          return 28;
        },
        sizeUnits: 'pixels',
        updateTriggers: {
          data:       [visibleClusters.length, this._expandedClusterId],
          getIcon:    [visibleClusters.length],
          getSize:    [this._focusedId, this._hoveredId],
        },
      }),

      // v4: globe-cluster-labels — "+N · DE" sublabel rendered ABOVE the
      // cluster badge. Only for clusters with count > 1 (sublabel is empty
      // for singletons; geoCluster suppresses it). Also hidden for the
      // currently expanded cluster (the spiderfy children replace the
      // count visually).
      //
      // pixelOffset.y = -22 puts the text just above the 28 px icon,
      // leaving a small visual gap. text + background fill via TextLayer's
      // built-in background props (rendered as a separate background quad
      // by deck.gl 9 when `background: true`).
      new TextLayer<Cluster>({
        id: 'globe-cluster-labels',
        data: visibleClusters.filter(
          (c) => !c.isSingleton && c.id !== this._expandedClusterId,
        ),
        pickable: false,
        billboard: true,
        getPosition: (c) => [c.lng, c.lat],
        getPixelOffset: [0, -24],
        getText: (c) => c.sublabel,
        getColor: [232, 237, 245, 240],
        getSize: 11,
        sizeUnits: 'pixels',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 600,
        background: true,
        backgroundPadding: [6, 3, 6, 3],
        getBackgroundColor: [4, 8, 16, 220],
        getBorderColor: [0, 229, 255, 140],
        getBorderWidth: 1,
        parameters: { depthTest: false } as any,
        updateTriggers: {
          data:    [visibleClusters.length, this._expandedClusterId],
          getText: [visibleClusters.length],
        },
      }),

      // v4: globe-spiderfy-icons — children of the expanded cluster, each
      // anchored at the cluster centroid plus a per-child pixel offset
      // computed by getSpiderfyOffsets. Single layer for ALL children
      // (COMPANY with iconUrl, PERSON/COUNTRY without). When iconUrl is
      // present we use it directly (mask:false, no color tint); otherwise
      // the generic dot icon + getColor tint by entity type.
      //
      // The pickable:true here makes spiderfy children individually
      // clickable; the onClick handler emits ENTITY_CLICK on the specific
      // child without collapsing the cluster.
      new IconLayer<SpiderfyChild>({
        id: 'globe-spiderfy-icons',
        data: spiderfyChildren,
        pickable: true,
        billboard: true,
        parameters: { depthTest: false } as any,
        getPosition:    (d) => [d._clusterLng, d._clusterLat],
        getPixelOffset: (d) => [d._pxX, d._pxY],
        getIcon: (d) => {
          if (d.iconUrl) {
            return { url: d.iconUrl, width: 64, height: 64, anchorX: 32, anchorY: 32, mask: false };
          }
          return { url: GENERIC_DOT_DATA_URL, width: 32, height: 32, anchorX: 16, anchorY: 16, mask: true };
        },
        getColor: (d) => {
          const t = d.type.toUpperCase();
          if (t === 'PERSON')  return [255, 210, 0, 240];
          if (t === 'COUNTRY') return [245, 166, 35, 240];
          return [0, 229, 255, 240];
        },
        getSize: (d) => (d.nodeId === this._focusedId ? 32 : d.nodeId === this._hoveredId ? 30 : 26),
        sizeUnits: 'pixels',
        updateTriggers: {
          data:          [spiderfyChildren.length, this._expandedClusterId],
          getPosition:   [this._expandedClusterId],
          getPixelOffset:[this._expandedClusterId],
          getSize:       [this._focusedId, this._hoveredId],
        },
      }),
    ];
  }

  // v4: arc filter for the expanded-cluster case. Returns the subset of
  // _arcs whose source OR target nodeId belongs to the expanded cluster.
  // O(arcs · expandedChildren) but at iPM scale (~80 arcs, ≤20 children
  // per cluster) it's a few-hundred-op filter — well under 1 ms.
  private _filterArcsForExpandedCluster(): EngineArc[] {
    const expanded = this._expandedClusterId
      ? this._clusters.find((c) => c.id === this._expandedClusterId)
      : null;
    if (!expanded) return [];
    const childIds = new Set(expanded.children.map((e) => String(e.nodeId ?? e.id)));
    return this._arcs.filter(
      (a) => childIds.has(a.sourceNodeId) || childIds.has(a.targetNodeId),
    );
  }

  // v4 layer build pipeline. Camera-dependent on the hemisphere filter
  // only; clusters themselves are precomputed in _recluster (CMD.SET_
  // ENTITIES) and _maybeRecluster (zoom-threshold crossing).
  //
  // Cost: O(visible) hemisphere filter + O(layers) array literal
  // construction + getSpiderfyOffsets() (O(count) trig, called at most
  // once per redraw when a cluster is expanded). Runs on every _redraw()
  // — hover, click, focus, rAF rotation tick, fly-to lerp, click-ripple
  // animation. At iPM scale (~50 entities → ~20 clusters, ~12 layers)
  // each redraw is well under a millisecond.
  private _buildLayers(): any[] {
    const visible = this._computeVisibleClusters();
    return [
      ...this._buildStaticLayers(visible),
      ...this._buildAnimatedLayers(visible),
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

  // v4: arcs are end-to-end on REAL HQ coordinates from the mapper.
  // Individual-arcs layer reads endpoints verbatim; aggregated-arcs layer
  // remaps endpoints to cluster centroids in aggregateArcs.ts. No
  // _resolveArcsToDisplay rebind step exists (see v1 git history for the
  // legacy spread-cluster rebinder that this architecture obsoletes).

  private _startIdlePulse(): void {
    if (this._idleInterval !== null) return;
    // No-op tick loop kept as a scaffold for Phase 8+ idle arcs animation.
    // Once a real animation exists, swap the body for a frame budget +
    // _redraw() call. Today, calling _redraw() at 15 Hz here would push
    // identical layers to deck.gl for zero visual effect.
    this._idleInterval = setInterval(() => {}, 67);
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
    // v4: look up the entity in raw entities first (covers spiderfy
    // children clicks where the target may be any cluster member, not
    // just the dominant one). Fall back to a cluster scan only if we
    // can't find it — defensive against id-shape drift.
    const entity =
      this._rawEntities.find((e) => e.nodeId === target.nodeId) ??
      this._clusters
        .flatMap((c) => c.children)
        .find((e) => e.nodeId === target.nodeId);
    if (!entity) return;
    this._focusedId = target.nodeId;
    this._flyToEntityClick = true;
    this._executeFlyTo(entity.longitude, entity.latitude, 2.8, 1800, () => {
      this._flyToEntityClick = false;
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
    // Fresh fly-to: reset the cancel flag. A subsequent SET_ROTATION false
    // will flip it back to true mid-flight, freezing this animation at the
    // current frame (Rule 7). For powermap dispatches AppShell orders the
    // effects SET_ROTATION → FLY_TO so this reset wins; for entity-click
    // fly-tos started from `onClick`, the SET_ROTATION false arrives
    // ~50 ms later and aborts the cinematic.
    this._flyToCancelled = false;

    const s0 = this._viewState?.longitude ?? 0;
    const s1 = this._viewState?.latitude  ?? 0;
    const s2 = this._viewState?.zoom      ?? 2;
    const t0 = performance.now();
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const tick = (now: number) => {
      // Rule 7: bail without scheduling another frame if rotation was disabled
      // mid-flight (SET_ROTATION false → _flyToCancelled true). The camera
      // freezes at its current interpolation; `_userInteracting` stays true
      // because the rotation handler set it, so no other motion can resume.
      if (this._flyToCancelled) return;

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