# Day 0 — Engine Architecture Audit
Date: 2026-05-13  
Branch: `experiment/design-features`

## 1) BridgeCommand matrix (contract vs implementation)

Legend:
- `handled`: explicit non-empty behavior in `send()`
- `stub`: explicit case exists but intentional no-op
- `drop`: no case for command (or base stub bridge no-op for all commands)

| Command | GlobeBridge | GraphBridge | NetworkBridge | ForceBridge |
|---|---|---|---|---|
| `CMD.SET_VIEW` | stub¹ | stub² | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_FOCUS` | handled | stub³ | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_ENTITIES` | handled | drop⁴ | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_ARCS` | handled | drop⁴ | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_GRAPH` | drop | handled | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_COMPANY_SELECTION` | drop | drop | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_POWERMAP` | handled | drop | drop (stub bridge) | drop (stub bridge) |
| `CMD.FLY_TO` | handled | drop | drop (stub bridge) | drop (stub bridge) |
| `CMD.SET_ROTATION` | handled | drop | drop (stub bridge) | drop (stub bridge) |
| `CMD.SUSPEND` | handled | handled | drop (stub bridge) | drop (stub bridge) |
| `CMD.RESUME` | handled | handled | drop (stub bridge) | drop (stub bridge) |
| `CMD.DISPOSE` | handled | handled | drop (stub bridge) | drop (stub bridge) |

Footnotes:
- ¹ `GlobeBridge.setView()` body: `// Globe always renders the globe view — no-op for AtlasView mode changes` — documented no-op.
- ² `GraphBridge.setView()` body: `// No separate view sub-modes in skeleton — graph is always the graph engine.` — documented no-op.
- ³ `GraphBridge.setFocus()` body: `// Camera / selection wiring when EntityRef + layout map exist (S2+).` — future-work stub.
- ⁴ `GraphBridge` `CMD.SET_ENTITIES` / `CMD.SET_ARCS` have `case 'CMD.X': break;` with **no comment**. Legend requires "intentional no-op" for "stub"; absence of comment makes these silent drops, not stubs. Promoted to **drop** to match gap severity.

Notes:
- `GraphBridge` intentionally focuses on graph payload (`CMD.SET_GRAPH`) and lifecycle; several command types are currently silent drops.
- `NetworkBridge` and `ForceBridge` are test stubs inheriting `BaseBridge.send()` with no command routing.

## 2) BridgeEvent propagation matrix

| Event | Emitted by | EngineManager action | Reaches `app.machine` |
|---|---|---|---|
| `ENGINE.READY` | globe, graph, network, force | local transition (`initializing`/`crossfading.waiting` -> ready path) | no |
| `ENGINE.ERROR` | globe, graph, network, force | initializing: fail + `sendParent`; crossfading.waiting: rollback only | partial (yes on init, no on swap-wait error) |
| `ENGINE.ENTITY_CLICK` | globe | forwarded via `sendParent` to `ATLAS.ENTITY_CLICK` | yes |
| `ENGINE.ENTITY_HOVER` | globe | no handler in manager | no (orphaned) |

Notes:
- Contract includes hover, and `GlobeBridge` emits it, but manager does not forward/consume it.
- Swap-time errors are handled locally by rollback and do not notify parent via `ATLAS.ENGINE_FAILED`.

## 3) Lifecycle invariants (PASS/FAIL)

1. Max 2 WebGL contexts during normal crossfade: **PASS (nominal path)**  
   `suspendPreviousBridge` on swap and `disposePreviousBridge` after 400 ms settling are present.

2. `activeSlot` toggle correctness: **PASS (nominal path)**  
   `clearPrevious` flips `activeSlot`; `EngineSlot.deriveOpacity()` uses `activeSlot` plus crossfade substate.

3. Worker terminated on `GraphBridge.dispose()`: **PASS**  
   `this._worker?.terminate()` is called before renderer/context teardown.

4. Canvas/resource cleanup on dispose (both bridges): **PASS**  
   Globe: `deck.finalize()` + `canvas.remove()`. Graph: renderer dispose + `forceContextLoss()` + `canvas.remove()`.

5. No SWAP on initial mount: **PASS**  
   `AppShell` guard (`prevAtlasRef.current === null`) prevents first-render swap.

6. Rapid SWAP correctness (`ENGINE.SWAP` during `crossfading`): **FAIL**  
   Manager accepts `ENGINE.SWAP` at `active` root even while crossfading; `moveCurrentToPrevious` overwrites `previousBridge` before old previous bridge is disposed.

## 4) Gap registry with severity

### High
- **Rapid-swap leak risk in crossfading state**  
  A new `ENGINE.SWAP` can arrive before prior `settling` disposes `previousBridge`, replacing references and risking leaked bridge/context/worker.
- **`ENGINE.DISPOSE` in active state does not release `previousBridge`**  
  During crossfade, dispose path clears current bridge only; previous bridge/unsubscribe references can remain undisposed.

### Medium
- **Silent command drops without explicit documentation**  
  `CMD.SET_COMPANY_SELECTION` is in contract but dropped by both real bridges. `CMD.SET_ENTITIES` / `CMD.SET_ARCS` are also silent drops in `GraphBridge` (no comment).
- **Orphaned hover event path**  
  `ENGINE.ENTITY_HOVER` is emitted but never consumed or escalated.
- **Error escalation inconsistency**  
  Init errors escalate to parent; swap waiting errors do rollback without `ATLAS.ENGINE_FAILED`.
- **FPS state not reset on `GraphBridge._startLoop()`**  
  `_frameCount` and `_fpsWindowStart` are not cleared when `_startLoop()` is called on `resume()`. After any crossfade (≥400ms settling), `t - _fpsWindowStart >= 3` is guaranteed true on the first tick, which computes fps ≈ 0 and immediately activates degraded mode (pixelRatio=1, 128-node cap, rotation off). Scenario B will show false-degraded behavior until fixed. Fix: add `this._frameCount = 0; this._fpsWindowStart = 0;` at the top of `_startLoop()` ([GraphBridge.ts:340](../../src/engine/GraphBridge.ts#L340)).

### Low
- **Bridge capability asymmetry not declared in contract**  
  `GlobeBridge` and `GraphBridge` intentionally differ, but no explicit capability map describes expected no-op/drop behavior.
- **`GraphBridge._degraded` is a one-way ratchet**  
  Once degraded mode activates it never resets — not on `resume()`, not on `CMD.SET_GRAPH` with a smaller dataset. Undocumented. If intentional (permanent safety floor), add a comment; if not, add a reset path on `resume()` or when nodeCount drops below cap.

## 5) Recommended resolution sequence

1. **Protect crossfade lifecycle first (High):** reject/queue `ENGINE.SWAP` during `crossfading`, or ensure previous bridge chain is always disposed.
2. **Harden dispose semantics (High):** `ENGINE.DISPOSE` must also dispose `previousBridge`/`previousUnsubscribe` when present.
3. **Normalize error policy (Medium):** decide and document whether swap-time bridge errors must emit `ATLAS.ENGINE_FAILED`.
4. **Document command/event capability matrix (Medium/Low):** make intentional stubs explicit to avoid silent regressions.
5. **Decide hover fate (Medium):** either wire forwarding to `app.machine` or remove it from contract.
