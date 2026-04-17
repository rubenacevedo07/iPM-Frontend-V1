#!/bin/bash
# Fix GlobeBridge viewState API for DeckGL 9 — remove 'globe' key wrapper

set -e

cat > src/engine/GlobeBridge.ts << 'EOF'
// src/engine/GlobeBridge.ts
// Real DeckGL imperative bridge — replaces GlobeBridge stub in engineFactory.ts
// Rule 5: new Deck({...}) only. No <DeckGL />, no reconciler, no R3F.
// DeckGL 9.x: viewState is flat (no named-view key wrapper for _GlobeView)

import { Deck, _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer }     from '@deck.gl/layers';
import type { EngineId, EngineInitInput, EngineViewInput, EngineFocusInput } from './contracts/inputs';
import type { IEngineBridge, BridgeCommand, BridgeEvent, Unsubscribe }       from './contracts/bridge';

const INITIAL_VIEW  = { longitude: 20, latitude: 25, zoom: 0.7, minZoom: 0, maxZoom: 5 };
const ROTATE_SPEED  = 3.5;

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
    this.init(input);
  }

  async init(input: EngineInitInput): Promise<void> {
    this._container = input.container;

    try {
      const { width, height } = input.container.getBoundingClientRect();

      this._deck = new Deck({
        canvas:     this._createCanvas(input.container),
        width:      width  || input.container.offsetWidth  || window.innerWidth,
        height:     height || input.container.offsetHeight || window.innerHeight,
        views:      new DeckGlobeView({ id: 'globe' }),
        // DeckGL 9: viewState is flat — no named-view key wrapper
        initialViewState: {
          longitude: this._longitude,
          latitude:  this._latitude,
          zoom:      this._zoom,
          minZoom:   0,
          maxZoom:   5,
        },
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

  setView(_input: EngineViewInput): void {}

  setFocus(input: EngineFocusInput): void {
    this._focusedId = input.target?.nodeId ?? null;
    if (input.target && this._deck) this._flyTo(input.target);
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
    this._handlers  = [];
  }

  get status(): IEngineBridge['status'] {
    return this._status;
  }

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

  private _startRotation(): void {
    if (this._rafHandle !== null) return;
    this._lastT = 0;

    const tick = (t: number) => {
      if (!this._interacting && !this._suspended && !this._focusedId) {
        const dt         = this._lastT ? (t - this._lastT) / 1000 : 0;
        this._longitude += dt * ROTATE_SPEED;
        // DeckGL 9: setProps viewState is flat
        this._deck?.setProps({
          viewState: {
            longitude: this._longitude,
            latitude:  this._latitude,
            zoom:      this._zoom,
            minZoom:   0,
            maxZoom:   5,
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
    // TODO Phase 3b: resolve entity coordinates and animate flyTo
  }

  private _emit(event: BridgeEvent): void {
    this._handlers.forEach(h => h(event));
  }

  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) {
      this._emit(event);
    } else {
      this._pendingEvents.push(event);
    }
  }
}
EOF

echo "✅ GlobeBridge.ts updated — viewState API fixed for DeckGL 9"
echo "Next: npm run dev (HMR should reload automatically)"
