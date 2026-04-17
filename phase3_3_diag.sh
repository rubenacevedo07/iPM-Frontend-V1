#!/bin/bash
# Phase 3.3 diagnostic — add [DIAG] logs, rewrite 3 files
set -e

# ─── AppShell.tsx ─────────────────────────────────────────────────────────────
cat > src/app/AppShell.tsx << 'EOF'
import { useEffect, useRef, useCallback } from 'react'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'

function RouterSync() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()
  useEffect(() => {
    actor.send({ type: 'URL_CHANGED', search })
  }, [search, actor])
  return null
}

export function AppShell() {
  const actor          = AppActor.useActorRef()
  const engineRef      = AppActor.useSelector(s => s.context.engineManagerRef)
  const atlasView      = AppActor.useSelector(s => s.context.atlasView)
  const requestSentRef = useRef(false)

  useEffect(() => {
    console.log('[DIAG] AppShell mounted')
    const sub = actor.subscribe((snap) => {
      const engineSnap = engineRef.getSnapshot()
      console.log('[DIAG] app.machine state:', JSON.stringify(snap.value))
      console.log('[DIAG] engineManager state:', JSON.stringify(engineSnap.value))
      console.log('[DIAG] bridge status:', engineSnap.context.bridge?.status ?? 'null')
    })
    return () => sub.unsubscribe()
  }, [actor, engineRef])

  const handleRefsReady = useCallback((refs: EngineSlotRefs) => {
    console.log('[DIAG] handleRefsReady called')
    console.log('[DIAG] slotB dimensions:', JSON.stringify(refs.slotB.getBoundingClientRect()))
    if (requestSentRef.current) {
      console.log('[DIAG] ENGINE.REQUEST already sent, skipping')
      return
    }
    requestSentRef.current = true
    console.log('[DIAG] dispatching ENGINE.REQUEST, view:', atlasView)
    engineRef.send({
      type:     'ENGINE.REQUEST',
      engineId: 'globe',
      input:    { container: refs.slotB, view: atlasView },
    })
    console.log('[DIAG] ENGINE.REQUEST dispatched, state now:', JSON.stringify(engineRef.getSnapshot().value))
  }, [engineRef, atlasView])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10', position: 'relative' }}>
      <RouterSync />
      <EngineSlot actorRef={engineRef} onRefsReady={handleRefsReady} />
    </div>
  )
}
EOF

# ─── GlobeBridge.ts ───────────────────────────────────────────────────────────
cat > src/engine/GlobeBridge.ts << 'EOF'
// src/engine/GlobeBridge.ts — DIAGNOSTIC VERSION
import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer }     from '@deck.gl/layers';
import type { EngineId, EngineInitInput, EngineViewInput, EngineFocusInput } from './contracts/inputs';
import type { IEngineBridge, BridgeCommand, BridgeEvent, Unsubscribe }       from './contracts/bridge';

const INITIAL_VIEW  = { longitude: 20, latitude: 25, zoom: 0.7, minZoom: 0, maxZoom: 5 };
const ROTATE_SPEED  = 3.5;
const COUNTRIES_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';
const GLOBE_BASE_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [{ type: 'Feature' as const,
    geometry: { type: 'Polygon' as const,
      coordinates: [[[-180,-89],[180,-89],[180,89],[-180,89],[-180,-89]]] },
    properties: {} }],
};

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

  constructor(input: EngineInitInput) {
    console.log('[DIAG] GlobeBridge constructor called');
    void this.init(input);
  }

  async init(input: EngineInitInput): Promise<void> {
    console.log('[DIAG] GlobeBridge.init() start');
    this._container = input.container;
    try {
      const { width, height } = input.container.getBoundingClientRect();
      console.log('[DIAG] container dims:', { width, height,
        offsetW: input.container.offsetWidth, offsetH: input.container.offsetHeight });
      const resolvedW = width  || input.container.offsetWidth  || window.innerWidth;
      const resolvedH = height || input.container.offsetHeight || window.innerHeight;

      console.log('[DIAG] creating Deck, resolvedW:', resolvedW, 'resolvedH:', resolvedH);
      this._deck = new Deck({
        canvas: this._createCanvas(input.container),
        width: resolvedW, height: resolvedH,
        views: new DeckGlobeView({ id: 'globe' }),
        initialViewState: { longitude: this._longitude, latitude: this._latitude,
          zoom: this._zoom, minZoom: 0, maxZoom: 5 },
        controller: true,
        layers: this._buildLayers(),
        onViewStateChange: ({ viewState }: any) => {
          this._interacting = true;
          this._longitude = viewState.longitude ?? this._longitude;
          this._latitude  = viewState.latitude  ?? this._latitude;
          this._zoom      = viewState.zoom       ?? this._zoom;
          if (this._interactionTimeout !== null) window.clearTimeout(this._interactionTimeout);
          this._interactionTimeout = window.setTimeout(() => {
            this._interacting = false; this._interactionTimeout = null;
          }, 2000);
        },
        onClick: (info: any) => {
          if (info.layer?.id === 'globe-rings' && info.object)
            this._emitOrBuffer({ type: 'ENGINE.ENTITY_CLICK', entity: info.object });
        },
        onHover: (info: any) => {
          const entity = info.layer?.id === 'globe-rings' ? (info.object ?? null) : null;
          this._emitOrBuffer({ type: 'ENGINE.ENTITY_HOVER', entity });
        },
      });
      console.log('[DIAG] Deck created');

      this._ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        this._deck?.setProps({ width: w, height: h });
      });
      this._ro.observe(input.container);

      this._startRotation();
      this._status = 'ready';
      console.log('[DIAG] emitting ENGINE.READY, handlers count:', this._handlers.length);
      this._emit({ type: 'ENGINE.READY', engineId: 'globe' });
      this._pendingEvents.forEach(e => this._emit(e));
      this._pendingEvents = [];
      console.log('[DIAG] GlobeBridge init complete');
    } catch (error) {
      console.error('[DIAG] GlobeBridge init FAILED:', error);
      this._status = 'failed';
      this._emitOrBuffer({ type: 'ENGINE.ERROR', engineId: 'globe', error: error as Error });
    }
  }

  setView(_input: EngineViewInput): void {}
  setFocus(input: EngineFocusInput): void {
    this._focusedId = input.target?.nodeId ?? null;
    if (input.target && this._deck) this._flyTo(input.target);
    this._redraw();
  }
  suspend(): void { this._suspended = true;  this._stopRotation(); }
  resume():  void { this._suspended = false; this._startRotation(); }
  dispose(): void {
    this._stopRotation();
    if (this._interactionTimeout !== null) { window.clearTimeout(this._interactionTimeout); this._interactionTimeout = null; }
    this._ro?.disconnect(); this._deck?.finalize();
    this._deck = null; this._ro = null; this._container = null;
    this._status = 'disposed'; this._handlers = [];
  }
  get status(): IEngineBridge['status'] { return this._status; }
  send(command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    switch (command.type) {
      case 'CMD.SET_VIEW':  this.setView({ view: command.view });      break;
      case 'CMD.SET_FOCUS': this.setFocus({ target: command.target }); break;
      case 'CMD.SUSPEND':   this.suspend();  break;
      case 'CMD.RESUME':    this.resume();   break;
      case 'CMD.DISPOSE':   this.dispose();  break;
    }
  }
  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    if (this._pendingEvents.length > 0) {
      this._pendingEvents.forEach(e => handler(e));
      this._pendingEvents = [];
    }
    return () => { this._handlers = this._handlers.filter(h => h !== handler); };
  }
  private _createCanvas(container: HTMLDivElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute'; canvas.style.inset = '0';
    container.appendChild(canvas); return canvas;
  }
  private _buildLayers() {
    return [
      new GeoJsonLayer({ id: 'globe-base', data: GLOBE_BASE_GEOJSON,
        filled: true, getFillColor: [4,11,26,255], stroked: false }),
      new GeoJsonLayer({ id: 'globe-countries', data: COUNTRIES_URL,
        filled: true, stroked: true, getFillColor: [8,20,48,80],
        getLineColor: [0,229,255,25], lineWidthMinPixels: 0.5 }),
      new ScatterplotLayer({ id: 'globe-rings', data: [], pickable: true,
        radiusUnits: 'meters', getRadius: 80_000,
        getFillColor: [0,229,255,40], getLineColor: [0,229,255,180],
        stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1.5,
        updateTriggers: { getFillColor: [this._focusedId], getRadius: [this._focusedId] } }),
    ];
  }
  private _redraw(): void { this._deck?.setProps({ layers: this._buildLayers() }); }
  private _startRotation(): void {
    if (this._rafHandle !== null) return;
    this._lastT = 0;
    const tick = (t: number) => {
      if (!this._interacting && !this._suspended && !this._focusedId) {
        const dt = this._lastT ? (t - this._lastT) / 1000 : 0;
        this._longitude += dt * ROTATE_SPEED;
        this._deck?.setProps({ viewState: { longitude: this._longitude,
          latitude: this._latitude, zoom: this._zoom, minZoom: 0, maxZoom: 5 } });
      }
      this._lastT = t; this._rafHandle = requestAnimationFrame(tick);
    };
    this._rafHandle = requestAnimationFrame(tick);
  }
  private _stopRotation(): void {
    if (this._rafHandle !== null) { cancelAnimationFrame(this._rafHandle); this._rafHandle = null; }
  }
  private _flyTo(_target: { nodeId: string }): void {}
  private _emit(event: BridgeEvent): void { this._handlers.forEach(h => h(event)); }
  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) this._emit(event);
    else this._pendingEvents.push(event);
  }
}
EOF

# ─── engineManager.machine.ts — inject [DIAG] into createBridgeAndSubscribe ──
cat > src/engine/engineManager.machine.ts << 'EOF'
// src/engine/engineManager.machine.ts — DIAGNOSTIC VERSION
import { setup, assign, sendParent }                        from 'xstate';
import type { EngineId, EngineInitInput }                   from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, Unsubscribe }     from './contracts/bridge';
import { createEngine }                                     from './engineFactory';

interface EngineManagerContext {
  engineId:            EngineId | null;
  bridge:              IEngineBridge | null;
  unsubscribe:         Unsubscribe | null;
  previousBridge:      IEngineBridge | null;
  previousUnsubscribe: Unsubscribe | null;
  container:           HTMLDivElement | null;
  error:               Error | null;
}

type EngineManagerEvent =
  | { type: 'ENGINE.REQUEST'; engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.SWAP';    engineId: EngineId; input: EngineInitInput }
  | { type: 'ENGINE.DISPOSE' }
  | { type: '_BRIDGE.EVENT';  event: BridgeEvent };

function isBridgeReady(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.READY';
}
function isBridgeError(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ERROR';
}
function isEntityClick(event: EngineManagerEvent): boolean {
  return event.type === '_BRIDGE.EVENT' && event.event.type === 'ENGINE.ENTITY_CLICK';
}

export const engineManagerMachine = setup({
  types: { context: {} as EngineManagerContext, events: {} as EngineManagerEvent },
  actions: {
    createBridgeAndSubscribe: assign(({ event, self }) => {
      console.log('[DIAG] createBridgeAndSubscribe called, event:', event.type);
      const e = event as Extract<EngineManagerEvent, { type: 'ENGINE.REQUEST' | 'ENGINE.SWAP' }>;
      console.log('[DIAG] creating engine:', e.engineId);
      const bridge = createEngine(e.engineId, e.input);
      console.log('[DIAG] bridge created, subscribing...');
      const unsubscribe = bridge.onEvent((bridgeEvent) => {
        console.log('[DIAG] bridge event received in manager:', bridgeEvent.type);
        self.send({ type: '_BRIDGE.EVENT', event: bridgeEvent });
      });
      console.log('[DIAG] subscription active');
      return { bridge, unsubscribe, engineId: e.engineId, container: e.input.container };
    }),

    moveCurrentToPrevious: assign({
      previousBridge:      ({ context }) => context.bridge,
      previousUnsubscribe: ({ context }) => context.unsubscribe,
      bridge:              () => null,
      unsubscribe:         () => null,
    }),
    suspendPreviousBridge: ({ context }) => { context.previousBridge?.send({ type: 'CMD.SUSPEND' }); },
    disposePreviousBridge: ({ context }) => {
      context.previousUnsubscribe?.(); context.previousBridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearPrevious: assign({ previousBridge: () => null, previousUnsubscribe: () => null }),
    rollbackSwap: assign({
      bridge:              ({ context }) => context.previousBridge,
      unsubscribe:         ({ context }) => context.previousUnsubscribe,
      previousBridge:      () => null,
      previousUnsubscribe: () => null,
      error: ({ event }) => {
        const e = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
        return e.event.type === 'ENGINE.ERROR' ? e.event.error : null;
      },
    }),
    resumeCurrentBridge: ({ context }) => { context.bridge?.send({ type: 'CMD.RESUME' }); },
    disposeBridge: ({ context }) => {
      context.unsubscribe?.(); context.bridge?.send({ type: 'CMD.DISPOSE' });
    },
    clearBridge: assign({
      bridge: () => null, unsubscribe: () => null,
      engineId: () => null, container: () => null, error: () => null,
    }),
    assignError: assign({
      error: ({ event }) => {
        const e = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
        return e.event.type === 'ENGINE.ERROR' ? e.event.error : null;
      },
    }),
    forwardEntityClick: sendParent(({ event }) => {
      const e  = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
      const ev = e.event as Extract<BridgeEvent, { type: 'ENGINE.ENTITY_CLICK' }>;
      return { type: 'ATLAS.ENTITY_CLICK', entity: ev.entity } as const;
    }),
    escalateError: sendParent(({ context, event }) => {
      const e  = event as Extract<EngineManagerEvent, { type: '_BRIDGE.EVENT' }>;
      const ev = e.event as Extract<BridgeEvent, { type: 'ENGINE.ERROR' }>;
      return { type: 'ATLAS.ENGINE_FAILED', engineId: context.engineId, error: ev.error } as const;
    }),
  },
  guards: {
    isBridgeReady: ({ event }) => isBridgeReady(event),
    isBridgeError: ({ event }) => isBridgeError(event),
    isEntityClick: ({ event }) => isEntityClick(event),
  },
}).createMachine({
  id: 'engineManager',
  initial: 'idle',
  context: {
    engineId: null, bridge: null, unsubscribe: null,
    previousBridge: null, previousUnsubscribe: null,
    container: null, error: null,
  },
  states: {
    idle: {
      on: { 'ENGINE.REQUEST': { target: 'initializing', actions: ['createBridgeAndSubscribe'] } },
    },
    initializing: {
      on: {
        '_BRIDGE.EVENT': [
          { guard: 'isBridgeReady', target: 'active' },
          { guard: 'isBridgeError', target: 'failed', actions: ['assignError', 'escalateError'] },
        ],
      },
    },
    active: {
      initial: 'idle',
      on: {
        '_BRIDGE.EVENT': { guard: 'isEntityClick', actions: 'forwardEntityClick' },
        'ENGINE.SWAP': {
          target: 'active.crossfading',
          actions: ['moveCurrentToPrevious', 'suspendPreviousBridge', 'createBridgeAndSubscribe'],
        },
        'ENGINE.DISPOSE': { target: 'idle', actions: ['disposeBridge', 'clearBridge'] },
      },
      states: {
        idle: {},
        crossfading: {
          initial: 'waiting',
          states: {
            waiting: {
              on: {
                '_BRIDGE.EVENT': [
                  { guard: 'isBridgeReady', target: 'settling' },
                  { guard: 'isBridgeError', target: '#engineManager.active.idle',
                    actions: ['rollbackSwap', 'resumeCurrentBridge'] },
                ],
              },
            },
            settling: {
              after: { 400: { target: '#engineManager.active.idle',
                actions: ['disposePreviousBridge', 'clearPrevious'] } },
            },
          },
        },
      },
    },
    failed: {
      on: { 'ENGINE.REQUEST': { target: 'initializing', actions: ['clearBridge', 'createBridgeAndSubscribe'] } },
    },
  },
});
EOF

echo "✅ [DIAG] logs added to 3 files"
echo "Reload browser and check console for [DIAG] output"
