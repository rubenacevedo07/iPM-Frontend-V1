# State Model — The Four Levels

**Source:** `docs/skills/ipm-v4-core-architect.md`
**Enforced by:** `docs/skills/ipm-data-fusion-enforcer.md` during PR review

## The Rule
Global truth = **URL + SessionShellState + WorkspaceContext + EngineState**.
If not reconstructible from those four, NOT global state.
`EngineEphemeralState` is derived, not truth.

## The Four Levels

### 1. NavigationState — URL
Owned: TanStack Router search params
Writer: `navigationActor` only
Reader: `app.machine` via `URL_CHANGED`

Contains: `mode`, `overlay`, `id` / `a` / `b`, shareable filters.
Examples:
```
/workstation
/workstation?overlay=person&id=7
/workstation?overlay=vs&a=7&b=173
/workstation?overlay=company&id=42
```

### 2. SessionShellState — `app.machine` context
Open panels, current transition state, engine target, degraded flag, auth state.

### 3. WorkspaceContext — serializable store
Focus entity, active scenario, selection set, compare set, timeline position, user preferences.
**Must be serializable** — no DOM refs, no function refs, ISO strings for dates.

### 4. EngineEphemeralState — inside engine
Camera matrix, hover, render buffers, animation clock, WebGL context.
Lost on `destroy()`. System recovers by:
1. Read NavigationState from URL
2. Read SessionShellState from `app.machine`
3. Read WorkspaceContext from store
4. Build fresh EngineInput via EngineBridge
5. Mount new engine with that input

## Anti-patterns
| Violation | Why |
|---|---|
| Selected node ID inside engine only | Not reconstructible — use WorkspaceContext |
| `useState` for "tab open" | Not reconstructible on refresh — URL or SessionShellState |
| Global store with camera matrix | Belongs in EngineEphemeralState |
| `router.navigate()` from component | Breaks single-writer rule |
| Engine reading WorkspaceContext | Engine receives ViewModel → EngineInput, not store |

## Example — opening Musk's person overlay
1. User clicks entity dot on globe (Elon Musk)
2. Engine emits `NODE_CLICK { entityId: 7 }`
3. `EngineBridge.normalizeEvent()` → `{ type: 'NODE_CLICK', nodeId: '7' }`
4. `app.machine` dispatches `OPEN_PERSON { id: 7 }`
5. `navigationActor` → `router.navigate({ search: { overlay: 'person', id: 7 } })`
6. URL: `/workstation?overlay=person&id=7`
7. Router fires `URL_CHANGED` → `app.machine` reads new state
8. `app.machine` sets `SessionShellState.openOverlay = 'person'`
9. React renders `<PersonOverlay id={7} />`
10. PersonOverlay uses `usePersonIntelligence(7)` → services → mapper → ViewModel
11. Globe stays rendered underneath; no engine switch

One direction. Clear ownership at every step.
