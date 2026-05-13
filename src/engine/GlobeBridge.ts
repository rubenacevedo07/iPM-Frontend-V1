// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ArcLayer, GeoJsonLayer, IconLayer, ScatterplotLayer } from '@deck.gl/layers';
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
import { pixelSpread, type Declutterd } from './pixelSpread';

// Day 4+: declutter algorithm has gone through THREE shapes; this is the
// third (and current). The history is preserved here because each step is a
// real tradeoff worth keeping documented.
//
//   v1  entitySpread.ts (geographic, deleted)
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
//   v3  pixelSpread.ts (hybrid, this file imports it)
//       Synthesis: union-find clustering by GEOGRAPHIC distance (stable in
//       time, doesn't change with camera), but layout INSIDE each cluster
//       is in screen PIXELS — multi-ring 32/56/80 px, applied via
//       IconLayer.getPixelOffset. No viewport.project / unproject anywhere
//       in the render loop. Computation runs ONCE per CMD.SET_ENTITIES
//       and the result is cached on the bridge as `_entities`.
//
// Consequences for the layers downstream:
//   - IconLayer:   getPosition = REAL lat/lng, getPixelOffset = d.pixelOffset.
//                  pickable: true now (was false in v2) so the click hits
//                  the LOGO the user sees, not the underlying ring stack.
//   - Scatterplot: getPosition = REAL lat/lng. Rings stay at the HQ (clusters
//                  of N entities show N overlapping rings at the cluster
//                  centre + N icons spread 32-80 px around them — the
//                  "data-true ring at HQ + visually-offset icon" pattern).
//   - ArcLayer:    a.source / a.target = REAL endpoints from the mapper.
//                  No rebind step.
//
// The "ring stays at HQ, icon moves" split is intentional: the ring tells
// you where the entity REALLY is, the icon tells you which entity it is
// (without overlap). Same pattern as Google Maps cluster pills.
type DeclutterdEntity = Declutterd<EngineEntityData['entities'][number]>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_VIEW = { longitude: 20, latitude: 25, zoom: 2, minZoom: 0, maxZoom: 5 };

// Local GeoJSON in /public/data — no network round-trip on startup.
// Layer renders empty if the file is missing (non-fatal: globe still works).
const COUNTRIES_URL = '/data/countries-110m.geojson';

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

  // Phase 4.1 / Day 4+ v3: entity data received via CMD.SET_ENTITIES, with
  // a per-cluster pixelOffset baked in by pixelSpread() at receipt time.
  // The longitude/latitude on each element are the REAL HQ — pixelOffset is
  // a separate field consumed by IconLayer.getPixelOffset. Stable in time:
  // these values don't change when the camera moves; they only refresh when
  // a new CMD.SET_ENTITIES arrives (typically once at mount).
  private _entities: DeclutterdEntity[] = [];

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

        // Cursor: pointer when hovering a pickable entity, grabbing while
        // panning, grab otherwise. deck.gl computes `isHovering` from the
        // pick buffer — true whenever the mouse is over a layer with
        // pickable:true (currently `globe-rings` + `globe-pm-rings`).
        getCursor: ({ isDragging, isHovering }: { isDragging: boolean; isHovering: boolean }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab',

        // Hover tooltip: small glass chip with the entity name. deck.gl
        // positions it automatically near the cursor. Only for our three
        // pickable entity layers (rings, icons, pm-rings). Plain text to
        // avoid XSS — deck.gl renders `text` as innerText (escaped).
        // Returning null disables the tooltip.
        getTooltip: (info: any) => {
          const id = info.layer?.id;
          if (id !== 'globe-rings' && id !== 'globe-pm-rings' && id !== 'globe-company-icons') return null;
          const name = info.object?.name ?? info.object?.label;
          if (!name) return null;
          return {
            text: String(name),
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
          // Two layers carry entity hits now (v3): globe-rings (real HQ,
          // works for every entity type) and globe-company-icons (offset
          // logo, companies only). Either one fires the same downstream
          // chain — _flyTo uses the entity's REAL longitude/latitude, the
          // emitted ENGINE.ENTITY_CLICK carries the full entity object, and
          // the click-ripple anchors on real coords too (see _startClickAnim).
          const id = info.layer?.id;
          const isEntityHit =
            (id === 'globe-rings' || id === 'globe-company-icons') && info.object;
          if (isEntityHit) {
            this._flyTo(info.object);
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
            this._startClickAnim(info.object);
          }
        },

        onHover: (info: any) => {
          // v3: three pickable entity layers — rings, company icons, pm-rings.
          // Dispatch EntityRef on hover-in (info.object), null on hover-out.
          // Dedup: only emit when _hoveredId changes (avoids flood for same-
          // object hovers as the cursor pixel-skitters inside one icon).
          const layerId = info.layer?.id;
          const isEntityLayer =
            layerId === 'globe-rings' ||
            layerId === 'globe-pm-rings' ||
            layerId === 'globe-company-icons';
          const hoveredNodeId =
            isEntityLayer && info.object
              ? (info.object.nodeId ?? info.object.id ?? null)
              : null;
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

          this._emitOrBuffer({
            type: 'ENGINE.ENTITY_HOVER',
            entity:
              info.object &&
              (info.layer?.id === 'globe-rings' || info.layer?.id === 'globe-company-icons')
                ? info.object
                : null,
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
        // Day 4+ v3: bake the cluster-aware pixel offset INTO the entity
        // array. pixelSpread() does geographic union-find at 50 km, then
        // assigns each cluster member a pixelOffset on a 32/56/80 px
        // multi-ring layout — sorted by id so the same input is always laid
        // out the same way. Result is reused for the lifetime of this entity
        // batch; the camera doesn't influence it. _buildIdleArcs() still
        // reads `.longitude/.latitude` (REAL coords on every element), which
        // pixelSpread preserves untouched.
        this._entities = pixelSpread(command.data.entities);
        this._idleArcs = this._buildIdleArcs();
        this._redraw();
        break;
      case 'CMD.SET_ARCS': {
        // Short-circuit: incoming and current both empty → no rebuild. Prevents
        // redundant layer churn on repeated CLOSE_OVERLAY dispatches and on
        // initial mount when no overlay is open.
        const incoming = command.data.arcs;
        if (this._arcs.length === 0 && incoming.length === 0) break;
        // Day 4+: arcs stored verbatim — endpoints stay on REAL HQ
        // longitude/latitude (the mapper's output). The previous
        // _resolveArcsToDisplay() rebound endpoints to spread-cluster
        // positions so the arc visually attached to the offset dot; with the
        // pixel-offset architecture, both the icon AND the underlying ring
        // sit on the real HQ, so no rebinding is needed.
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

  // Returns the camera-facing entities. Single-stage filter now — pixelSpread
  // already baked the pixelOffset into every element of this._entities at
  // SET_ENTITIES time, so we just keep the ones whose REAL HQ lat/lng falls
  // on the visible hemisphere. The threshold (-0.1 ≈ 96°) lets entities a
  // little past the limb still render — useful for arcs that anchor outside
  // the strict 90° hemisphere but whose visible arc body is still inside.
  private _computeVisibleEntities(): DeclutterdEntity[] {
    const vs = this._viewState ?? INITIAL_VIEW;
    const camLat = (vs.latitude  ?? 0) * Math.PI / 180;
    const camLng = (vs.longitude ?? 0) * Math.PI / 180;
    const cx = Math.cos(camLat) * Math.cos(camLng);
    const cy = Math.cos(camLat) * Math.sin(camLng);
    const cz = Math.sin(camLat);
    const THRESHOLD = -0.1;
    return this._entities.filter((d) => {
      const lat = d.latitude  * Math.PI / 180;
      const lng = d.longitude * Math.PI / 180;
      return (cx * Math.cos(lat) * Math.cos(lng) +
              cy * Math.cos(lat) * Math.sin(lng) +
              cz * Math.sin(lat)) > THRESHOLD;
    });
  }

  // Returns the 9 non-animated layers (base, countries, arcs, rings, dots,
  // powermap layers).
  //
  // No cache. The previous version had one keyed on (focused, hovered,
  // powermap, arcsRev, visibleCount, round(zoom), round(lat)) but it became
  // a liability twice in a row:
  //
  //   1. Under v2 (screen-space decluttering), the cache key didn't include
  //      longitude, but the visibleEntities array changed every frame during
  //      1 deg/sec rotation. Stale `data` arrays → spread froze in place.
  //   2. Under v3 (this version), visibleEntities still changes every frame
  //      because the hemisphere filter is camera-dependent — entities cross
  //      the limb continuously during rotation. The cache would need a
  //      per-frame key, which is just no cache.
  //
  // Cost of rebuilding: ~9 small layer objects per redraw, well inside the
  // 16 ms frame budget at the iPM scale (≤50 entities). If we ever need
  // caching, the right unit is the visibleEntities array reference, not a
  // coarse viewState round-down — and even that only helps when the camera
  // is stationary, which is most of the user's actual interaction time
  // (paused on an open overlay).
  private _buildStaticLayers(visibleEntities: DeclutterdEntity[]): any[] {
    return this._buildStaticLayersImpl(visibleEntities);
  }

  private _buildStaticLayersImpl(visibleEntities: DeclutterdEntity[]) {
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

    // Put the focused entity FIRST in the data array so that when its disc
    // overlaps a neighbour's disc in the picking buffer, the neighbour (drawn
    // later) wins the hit test — enabling re-selection of nearby entities.
    //
    // Why: globe-rings has parameters: { depthTest: false }. With depthTest
    // disabled, both the visual and pick framebuffers use plain overwrite
    // semantics — the LAST fragment written at a pixel wins. If focused were
    // last, focused would dominate every overlap and the user could never
    // click a neighbour close to it. The selected-halo (300 km, non-pickable)
    // remains the visual cue for the focused entity regardless of draw order.
    const orderedVisible = this._focusedId
      ? [
          ...visibleEntities.filter((d: any) => d.nodeId === this._focusedId),
          ...visibleEntities.filter((d: any) => d.nodeId !== this._focusedId),
        ]
      : visibleEntities;

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
          // _idleArcs.length included so the layer re-evaluates when entity set changes
          // (idle arcs are precomputed per entity batch; full idle arc rendering is Phase 8+).
          data:              [this._arcsRevision, this._idleArcs.length],
          getSourcePosition: [this._arcsRevision],
          getTargetPosition: [this._arcsRevision],
          getSourceColor:    [this._arcsRevision],
          getTargetColor:    [this._arcsRevision],
          getWidth:          [this._arcsRevision],
        },
      }),
      // Phase 8+: globe-selected-halo — cyan ring around focused entity at 300k radius.
      // v3: anchored to the REAL HQ lat/lng. The halo is a 300 km circle —
      // big enough that the pixelOffset of the icon (≤80 px ≈ 30-120 km at
      // typical zoom) sits comfortably inside the halo's footprint. No need
      // to chase the icon's offset slot.
      new ScatterplotLayer({
        id: 'globe-selected-halo',
        data: this._focusedId
          ? visibleEntities.filter((d: any) => d.nodeId === this._focusedId)
          : [],
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
          data: [this._focusedId, visibleEntities.length],
        },
      }),
      // Phase 7: globe-rings — pickable entity dots, ring stroke, hover/focus-aware radius.
      // v3: anchored to the REAL HQ lat/lng (NOT the icon's offset slot).
      // For clustered entities the N rings overlap visually at the cluster
      // centroid, while the N icons spread 32-80 px around. Picking on the
      // ring stack is supplemented by IconLayer picking (icons are now
      // pickable: true) so the user clicks the LOGO they see — the icon
      // wins because it's drawn after the rings.
      new ScatterplotLayer({
        id: 'globe-rings',
        data: orderedVisible,
        pickable: true,
        parameters: { depthTest: false } as any,
        radiusUnits: 'meters',
        getPosition:  (d: DeclutterdEntity) => [d.longitude, d.latitude],
        // Dynamic radius keeps the hit circle ~24 screen-px at all zoom levels.
        // Focused entity is last in orderedVisible so neighbours win the pick
        // when their discs overlap. Visual selection feedback via globe-selected-
        // halo (300 km ring, non-pickable) + stroke width + fill alpha below.
        getRadius:    dynamicRadius,
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
          getFillColor: [this._focusedId, this._hoveredId, visibleEntities.length],
          getLineColor: [visibleEntities.length],
          getLineWidth: [this._focusedId],
          getPosition:  [visibleEntities],
          getRadius:    [_zoom, _lat],
        },
      }),
      // Phase 7: globe-dots — decorative inner fill, non-pickable. Reads through the
      // ring's translucent fill to give the "ring + dot" visual pattern from v3.
      // v3: anchored to the REAL HQ lat/lng (sits inside the ring at the real
      // HQ, NOT under the offset icon). For non-icon entities (PERSON, COUNTRY)
      // this is the only visual indicator — they don't get the IconLayer offset
      // treatment because they don't have a logo, so dot at real HQ is correct.
      new ScatterplotLayer({
        id: 'globe-dots',
        data: visibleEntities.filter((d: any) => !d.iconUrl),
        pickable: false,
        radiusUnits: 'meters',
        getPosition:  (d: DeclutterdEntity) => [d.longitude, d.latitude],
        getRadius:    30_000,
        getFillColor: (d: any) => {
          const c = dotColor(d.type, d.isGold);
          return [c[0], c[1], c[2], 200];
        },
        updateTriggers: {
          getFillColor: [visibleEntities.length],
          getPosition:  [visibleEntities],
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

  // Builds the animated layers (arrival pulse, click ripple, company icons).
  // Historically kept separate from the static layers because the static
  // cache was not invalidated by animation state. The cache is gone now,
  // but the split still pays off — the animation RAFs (click ripple, fly-to
  // arrival pulse) call _buildLayers() at ~60 Hz, and that's the LAST place
  // we want to do anything beyond simple array literal construction. Static
  // and animated halves both rebuild every call; the names are documentation
  // of which fields drive each half (static: focus/hover/powermap/arcs;
  // animated: arrival pulse + click ripple + the icon layer's offsets,
  // which are read straight from the precomputed pixelOffset field).
  private _buildAnimatedLayers(visibleEntities: DeclutterdEntity[]): any[] {
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
      // Company logos — rendered last so depth buffer never clips them, AND
      // so picking prefers the icon over the ring underneath (deck.gl picks
      // the topmost layer on overlap; draw order = pick priority when
      // depthTest is off).
      // billboard: true keeps sprites camera-facing on _GlobeView.
      // depthTest: false prevents the globe sphere from z-clipping the sprite.
      //
      // v3: anchor at REAL HQ lat/lng + screen-pixel offset via the prop
      // pixelSpread() baked into each entity. Picking moved here (was false
      // pre-v3) so a click on a clustered logo hits the icon directly
      // instead of the random ring underneath the cluster centre.
      new IconLayer({
        id: 'globe-company-icons',
        data: visibleEntities.filter(
          (d: any) => d.type === 'COMPANY' && d.iconUrl,
        ),
        pickable: true,
        billboard: true,
        parameters: { depthTest: false } as any,
        getPosition:   (d: any) => [d.longitude, d.latitude],
        getPixelOffset:(d: any) => d.pixelOffset,
        getIcon: (d: any) => ({
          url:     d.iconUrl,
          width:   64,
          height:  64,
          anchorX: 32,
          anchorY: 32,
          mask:    false,
        }),
        getSize:   28,
        sizeUnits: 'pixels',
        updateTriggers: {
          getPosition:    [visibleEntities],
          getPixelOffset: [visibleEntities],
          getIcon:        [visibleEntities.length],
        },
      }),
    ];
  }

  // v3 layer build pipeline. Camera-dependent on the hemisphere filter only;
  // the pixelOffset on each entity was baked in by pixelSpread() at
  // SET_ENTITIES time and is reused as-is. No viewport.project / unproject
  // anywhere in the render loop.
  //
  // Cost: O(n) hemisphere filter + O(layers) array literal construction.
  // Runs on every _redraw() — that's hover/click/focus changes, the rAF
  // rotation tick (60 Hz while idle, gated by Rule 7), animation frames
  // during fly-to + click ripple + arrival pulse. At iPM scale (~50
  // entities, 9 layers) each redraw is well under a millisecond.
  private _buildLayers(): any[] {
    const visible = this._computeVisibleEntities();
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

  // v3: no arc rebind step. EngineArc.source / EngineArc.target stay on the
  // real HQ longitude/latitude emitted by the service-layer mapper, end to
  // end. The arc visually arrives at the underlying ring (which is also at
  // real HQ) inside a cluster's overlapping ring stack, while the icon sits
  // a few pixels off — a small acceptable mismatch in exchange for keeping
  // a single canonical coordinate on every record. Reverse migration: see
  // git history for _resolveArcsToDisplay (rebound arc endpoints to the
  // entitySpread offset coords) and v2's screenDeclutter (would have needed
  // per-frame unproject of the offset → not architecturally clean).

  private _startIdlePulse(): void {
    if (this._idleInterval !== null) return;
    this._idleInterval = setInterval(() => {
      this._idleAnimTime += 0.067;
      // _redraw() omitted here: idle arcs are precomputed in _idleArcs but not yet
      // wired into any rendered layer — calling _redraw() would push unchanged
      // layers to deck.gl at 15fps for no visual effect.
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