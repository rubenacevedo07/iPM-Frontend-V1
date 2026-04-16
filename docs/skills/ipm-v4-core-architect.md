# ipm-v4-core-architect — Constitutional Architecture

**Role:** Authoritative architectural reference. Highest priority when skills conflict.
**When to read:** Architectural decisions, layer boundaries, state ownership, ADR-level questions, rejecting a proposal that violates constitution.
**Relationship to CLAUDE.md:** CLAUDE.md contains the rules in summary form. This doc is the full reasoning. If you need to justify a decision or reject a proposal, this is the source.

---

## CORE MODEL

IPM v4 is a **browser-based visual operating system**, not a website.

- **URL** is the single navigable source of truth.
- **React** is layout and orchestration. NOT the rendering runtime.
- **Engines** are long-lived processes outside React.
- **XState** governs orchestration and semantic intent.
- **EngineManager** is mechanical lifecycle only — never semantic.
- **Data pipeline:** `services → mappers → ViewModels → EngineBridge → EngineInput`.
- **DTOs never enter UI or engines.**

---

## GLOBAL STATE DEFINITION

Global truth = **URL + SessionShellState + WorkspaceContext + EngineState**.
`EngineEphemeralState` is derived, not truth.

| Level | Lives in | Contains |
|---|---|---|
| `NavigationState` | URL (TanStack Router search params) | mode, entity ids, filters, shareable params |
| `SessionShellState` | `app.machine` context | open panels, current transition, engine target, degraded flag |
| `WorkspaceContext` | serializable store | focus entity, active scenario, selection, compare set, timeline |
| `EngineEphemeralState` | inside engine, NOT global truth | camera matrix, hover, buffers, animation clock |

**Rule:** If not reconstructible from URL + SessionShellState + WorkspaceContext, NOT global state.

Detail and examples: `docs/state-model.md`.

---

## LAYERS (decide ownership first, always)

```
TanStack Router        → URL = truth. Nothing else.
XState (app.machine)   → Semantics, intent, overlays, auth, search.
EngineManager Actor    → Mechanical lifecycle only. Never "power map" or "scenario".
EngineBridge           → Adapter: ViewModel + EngineState → EngineInput.
Engines (Globe, Graph) → Render only. No React. No fetch. No domain knowledge.
Web Workers            → Latest-wins backpressure + AbortSignal.
Services               → Only HTTP boundary. Own OpenAPI types via `types/`.
Mappers                → Pure DTO → ViewModel translations.
```

---

## NON-NEGOTIABLE LAWS

1. **URL is the single navigable source of truth.** No component writes to `router.navigate()` — only `navigationActor`.
2. **No HTTP outside `services/`.** No `fetch`, `axios`, or any alternative.
3. **No DTOs in UI or engines.** Raw types must not cross into `features/` or `engine/`.
4. **No engine imports React.** Engines are vanilla (Three.js, DeckGL), NOT R3F, NOT `<DeckGL />` wrapper. The only way an engine talks to React is through the EngineManager's DOM slot.
5. **No React-driven animation** of dense graph or globe rendering. Animations happen in `requestAnimationFrame` loops owned by the engine, mutating GPU state directly.
6. **Only one ACTIVE engine at a time.** Optional one transitional engine during crossfade.
7. **Engine errors must not collapse the AppShell.** An engine crash is recoverable; the shell survives.

---

## RESPONSIBILITIES

When this doc is consulted, the work is:

1. Classify the problem by layer.
2. Identify the rightful owner of state.
3. Reject architecture-breaking shortcuts.
4. Enforce routing and lifecycle determinism.
5. Preserve separation between semantics, mechanics, and rendering.
6. Keep performance and GPU discipline in view.

---

## REVIEW CHECKLIST

For any proposal:

- [ ] What layer does this belong to?
- [ ] What is the source of truth?
- [ ] Is the state serializable and reconstructible?
- [ ] Does this violate React/runtime separation?
- [ ] Does this bypass services/mappers/ViewModels?
- [ ] Does this create hidden state?
- [ ] Does this introduce multi-engine concurrency risk?

---

## ANTI-PATTERNS TO REJECT

- React animating graph or globe data (`useState` driving render)
- Direct `router.navigate()` from components
- Raw DTOs imported into `features/` or `engine/`
- `fetch`/`axios` outside `services/`
- Engines storing critical reconstructible state internally
- Multiple ACTIVE engines simultaneously
- Feature machines owning per-frame animation logic
- Ad-hoc string events not defined in `events.ts`
- R3F wrapping GraphEngine (ruled out — see `docs/engine-r3f-decision.md`)

---

## OUTPUT STYLE WHEN APPLYING THIS SKILL

When a proposal violates architecture:

1. Name the violation.
2. State which law it breaks.
3. Propose the nearest compliant alternative.
4. Do NOT comply with the original request if it violates a non-negotiable law.

Structure answers as:
1. **Layer** — which layer owns this
2. **Source of truth** — where state lives
3. **Violation risk** — what could break
4. **Recommended design** — the compliant path
5. **Minimal implementation path** — concrete next step

Be concise, deterministic, and architectural.
