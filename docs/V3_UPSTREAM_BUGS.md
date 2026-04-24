# v3 Upstream Bugs — Absorbed in V1

Bugs discovered in v3 canonical during V1 port phases. Each is absorbed by a V1-side shim (Rule 6 preserved — canonical untouched). This doc is formatted as GitHub-issue-ready so maintainers can copy-paste when filing upstream.

**Upstream repo:** `IPM_Frontend` (v3 canonical, path: `C:/Users/ruben/source/repos/iPM_GV/IPM_Frontend`)
**Discovered in:** V1 port (`IPM_Frontend_V1`)
**Absorbing V1 shim:** `src/components/overlays/sceneMap.ts`

---

## Bug 1 — `entity-inspector.machine` imports from a non-existent path

**File:** `src/machines/entity-inspector.machine.ts`
**Line:** 25
**Current import:**
```ts
import { getScene } from '@/components/overlays/sceneMap'
```
**Expected import:**
```ts
import { getScene } from '@/features/person-overlay/sceneMap'
```

### Repro

```bash
cd IPM_Frontend
find src -name "sceneMap*"
# → only: src/features/person-overlay/sceneMap.ts
# → NO: src/components/overlays/sceneMap.ts

grep -rn "from '@/components/overlays/sceneMap'" src
# → src/machines/entity-inspector.machine.ts:25 (ONLY consumer, ONLY unresolved import)
```

### Expected vs actual
| | v3 Vite runtime | v3 tsc |
|---|---|---|
| Expected | import resolves | no error |
| Actual | `Failed to resolve import "@/components/overlays/sceneMap"` — runtime 500 if entity-inspector loads | May or may not fail depending on resolve strategy |

### Impact
- Any consumer importing `entity-inspector.machine.ts` (e.g., `person-overlay.machine` spawns it) cannot load.
- V1 port blocked until a shim at `src/components/overlays/sceneMap.ts` re-exports from the actual path.

### Workaround (applied in V1)
`IPM_Frontend_V1/src/components/overlays/sceneMap.ts` exports `getScene` by re-routing to the canonical location. Rule 6 preserved.

### Upstream fix
Change line 25 of `src/machines/entity-inspector.machine.ts` to:
```ts
import { getScene } from '@/features/person-overlay/sceneMap'
```

---

## Bug 2 — `getScene` called with wrong arity (2 args instead of 3)

**File:** `src/machines/entity-inspector.machine.ts`
**Line:** 53 (and 64 for relation variant)
**Current call:**
```ts
// line 53, inside openEntity action:
return getScene(e.nodeId, e.name)

// line 64, inside openRelation action:
return getScene(e.target.nodeId, e.target.name)
```
**Expected call** (per `getScene` signature at `src/features/person-overlay/sceneMap.ts:40`):
```ts
// getScene signature:
export function getScene(
  id: number,
  type: 'PERSON' | 'COMPANY' | 'COUNTRY' | 'COMMODITY',
  name: string,
): TransitionScene

// Expected usage:
return getScene(e.id, e.type, e.name)
return getScene(e.target.id, e.target.type, e.target.name)
```

### Repro

Open an overlay that triggers `ENTITY.OPEN` on the entity-inspector machine — any person or company click route through this. Observe console:

```
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
    at getScene (sceneMap.ts:41:?)   // or :42 / :43 — FALLBACK branch
    at openEntity assign.resolveAssign (xstate)
```

### Expected vs actual
- **Expected:** `getScene` returns a scene for the given entity id+type, falling back to a generic scene with the entity's name if no hardcoded match exists.
- **Actual:** Two-arg call binds `e.nodeId` (string like `"person:7"`) to the `id` param and `e.name` (string) to the `type` param. The real `type` param is undefined → none of the `type === 'PERSON'` / `type === 'COMPANY'` branches match → falls to `return { ...FALLBACK, label: name.toUpperCase() }` where `name` (the real third argument) is `undefined` → **runtime TypeError**.

### Impact
- Crash on first `ENTITY.OPEN` dispatch to entity-inspector.
- Blocks every Person and Company overlay that routes through this machine.
- V1 port: surfaces on mount of `PersonOverlay` with URL `?overlay=person&id=7`.

### Workaround (applied in V1)
`IPM_Frontend_V1/src/components/overlays/sceneMap.ts` shim widens `getScene` to accept both arities:
- Canonical 3-arg: `(id: number, type: EntityType, name: string)`
- Buggy 2-arg: `(nodeId: string, name: string)` — shim parses `nodeId` prefix → extracts `type` + `id`, generates fallback label `"PERSON #7"` when name is empty.

Rule 6 preserved; canonical `entity-inspector.machine.ts` retained byte-for-byte.

### Upstream fix
Change lines 53 and 64 of `src/machines/entity-inspector.machine.ts` from:
```ts
return getScene(e.nodeId, e.name)
return getScene(e.target.nodeId, e.target.name)
```
to:
```ts
return getScene(e.id, e.type, e.name)
return getScene(e.target.id, e.target.type, e.target.name)
```

Once upstream is fixed, V1 shim's 2-arg fallback branch can be removed in a single commit (leaving only the re-export for Bug 1).

---

## Verification after upstream fix

1. Delete `IPM_Frontend_V1/src/components/overlays/sceneMap.ts` in V1
2. Re-run `npx tsc --noEmit` — should still pass (Bug 1 fixed by canonical import change)
3. Open `http://localhost:PORT/workstation?overlay=person&id=7` — should render without runtime TypeError (Bug 2 fixed by canonical arity change)
4. If both pass, the shim is no longer needed and V1 is fully canonical.
