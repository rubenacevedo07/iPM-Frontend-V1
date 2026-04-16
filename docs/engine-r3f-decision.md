# Engine / R3F Decision — Three.js Vanilla Only

**Date:** 2026-04-16
**Status:** DECIDED
**Reviewed by:** GPT, Gemini, Google AI Studio, Copilot, NotebookLM, Perplexity — unanimous

## Decision
GraphEngine uses **Three.js vanilla**. No R3F. No `@react-three/fiber`. No `@react-three/drei`.
GlobeEngine uses **DeckGL vanilla** (`new Deck({...})`). No `<DeckGL />` React component wrapper.

## Why (architectural)
Constitutional rule in `ipm-v4-core-architect`: **engines are long-lived processes outside React**.

Three reasons the rule exists:
1. Avoid React governing the render loop (60fps inside reconciler = death)
2. Avoid hidden state (`useState` driving render) — state must be reconstructible
3. Avoid engine unmount/remount on parent re-render — losing WebGL context

R3F passes (1) and (2) with discipline, but fails (3): **R3F's `<Canvas>` is a React component whose lifecycle depends on React**. EngineManager needs to create/destroy engines imperatively outside React. With R3F, `<Canvas>` is React-owned; EngineManager cannot control it without hacking the reconciler.

**R3F solves a problem where React is the shell of the render. In IPM, React is NOT the shell — EngineManager is.**

## Why (practical)
- **GC pressure:** Three.js vanilla pre-allocates `Matrix4`/`Color`/`Vector3` outside render loop. R3F creates temporaries per frame.
- **Atomic destroy:** Explicit `geometry.dispose()`, `material.dispose()`, `renderer.dispose()`, `renderer.forceContextLoss()`.
- **OffscreenCanvas portability:** Three.js vanilla works in Workers via `transferControlToOffscreen()`. R3F does not.
- **Explicit ownership:** Engine owns its `<canvas>`. EngineManager owns the engine. React knows nothing.

## Implementation pattern

### GOOD — vanilla
```ts
export class GraphEngine implements VisualEngine<GraphEngineInput> {
  init(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer(...)
    container.appendChild(this.renderer.domElement)
    // ...
  }
}

export class GlobeEngine implements VisualEngine<GlobeEngineInput> {
  init(container: HTMLElement) {
    this.deck = new Deck({
      parent: container,
      views: new _GlobeView({ resolution: 1 }),
      // ...
    })
  }
  destroy() { this.deck.finalize() }
}
```

### BAD — React-coupled
```ts
export function GraphEngine() { return <Canvas>...</Canvas> }
export function GlobeEngine(props) { return <DeckGL {...props} /> }
```

## How React and the engine talk
Exactly one contact point: `EngineSlot` renders two sibling `<div>`s:
```tsx
<div id="engine-a" style={{ position: 'absolute', inset: 0, opacity: 1 }} />
<div id="engine-b" style={{ position: 'absolute', inset: 0, opacity: 0 }} />
```
EngineManager passes one as `container` to `engine.init(container)`. After that, engine owns its canvas. React does not touch it.

## What we lose
- Declarative JSX scene graphs (~40 vanilla vs ~20 R3F lines)
- `drei` helpers (OrbitControls, etc.)
- React DevTools scene inspection

Not enough to re-open the question.
