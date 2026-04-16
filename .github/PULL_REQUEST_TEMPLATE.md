# PR Checklist — iPM_Frontend_V1

Use before approving any pull request. Goes in `.github/PULL_REQUEST_TEMPLATE.md`.

## Architecture
- [ ] Change belongs to the correct layer (per `docs/skills/ipm-v4-core-architect.md`)
- [ ] No forbidden cross-layer coupling introduced
- [ ] State ownership is explicit
- [ ] Global state reconstructible from URL + SessionShellState + WorkspaceContext + EngineState
- [ ] No hidden mutable global state introduced

## Routing and orchestration
- [ ] URL remains single navigable source of truth
- [ ] No component writes directly to `router.navigate()`
- [ ] `navigationActor` remains the only navigation writer
- [ ] `app.machine` semantics preserved

## Data pipeline (Rule 5)
- [ ] HTTP only in `services/`
- [ ] Mappers pure and explicit
- [ ] UI consumes ViewModels, not DTOs
- [ ] Engines consume compact render inputs, not backend objects
- [ ] New backend fields mapped deliberately

## Runtime (Rule 6)
- [ ] No React-driven animation introduced for dense graph/globe rendering
- [ ] Engine lifecycle respected
- [ ] Only one ACTIVE engine + optional transitional
- [ ] Workers support `AbortSignal` (when present)
- [ ] Stale `WorkerResult` outputs discarded
- [ ] `destroy()` cleanup complete (including `forceContextLoss()`)
- [ ] No R3F, no `<DeckGL />` wrapper

## Performance
- [ ] No obvious increase in draw calls, VRAM pressure, or RAF churn
- [ ] New heavy computation off main thread when appropriate
- [ ] Transition behavior compatible with DOM-composited crossfade

## Sprint discipline
- [ ] No handwritten API types (Rule 1)
- [ ] No `fetch()` outside `apiClient.ts` (Rule 2)
- [ ] No duplicate hook (Rule 3)
- [ ] No refactor of copied components (Rule 4)

## Review outcome
- [ ] Approve
- [ ] Request changes
- [ ] Escalate to Architect review
