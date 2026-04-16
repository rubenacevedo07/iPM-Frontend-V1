# ADR-0001 — Phase 2a Architectural Constraints (sprint 1)

**Status:** DECIDED, IMMUTABLE during sprint 1.
**Scope:** Applies to Phase 2a (AppShell + app.machine + TanStack Router URL sync).
**Reviewers:** User + Claude.
**Date:** 2026-04-16.

These decisions are frozen. During sprint 1, no proposal can violate them. Attempts to deviate must be rejected with a pointer to this ADR.

---

## Decision 1 — Zod for searchParams validation

**Chosen:** Install `zod` as a production dependency.

**Alternative rejected:** Manual validation with regex + type guards.

**Rationale:**
- TanStack Router's recommended pattern uses Zod schemas
- Phase 2b (EngineManager) and Phase 5-6 (overlay params) will also need schema validation
- Investing ~10kb once saves repeated validation code across phases
- Zod errors give cleaner developer experience than manual throws

**Install command:**
```
npm install zod
```

**Usage pattern for searchParams:**
```ts
// src/routes/workstation.tsx
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

const workstationSearchSchema = z.object({
  overlay: z.enum(['person', 'company', 'vs']).optional(),
  id: z.coerce.number().int().positive().optional(),
  a: z.coerce.number().int().positive().optional(),
  b: z.coerce.number().int().positive().optional(),
  q: z.string().optional()
})

export const Route = createFileRoute('/workstation')({
  validateSearch: (search) => workstationSearchSchema.parse(search)
})
```

Validation failures throw — TanStack Router catches and redirects to default.

---

## Decision 2 — useAuth and useGlobeTheme remain stubs until post-sprint 1

**Chosen:** `useAuth` returns `{ user: null, isAuthenticated: true }` in dev mode. `useGlobeTheme` returns `{ theme: 'dark' }`. Both are shims — no real auth, no theme switching.

**Alternative rejected:** Implementing `AuthContext`, `GlobeThemeContext`, token refresh flow, theme switcher UI during sprint 1.

**Rationale:**
- `.env` already has `VITE_DEV_AUTO_LOGIN=true`. That's the signal: sprint 1 operates in auto-auth mode.
- Real auth flow has ~8-12h of work (login UI, refresh flow, 401 interceptor, route guards, logout). Not in sprint 1 scope.
- Globe theme switching is cosmetic polish. Dark mode is the canonical look — sprint 1 commits to it.
- V3 already had stub versions of these hooks. Using them preserves the architecture without implementing.

**Rule for the sprint:**
> If Opus (or any future agent) proposes implementing real `useAuth`, real `AuthContext`, login/logout flow, token refresh UI, or theme switcher during sprint 1 — REFUSE. Point here. The answer is: "stubs until sprint 2+."

**Exception:** if a component in sprint 1 genuinely needs the current user's ID (for example, to log predictions), it reads from `useAuth()` which returns a dev-mode default user. The UI never shows a "Sign in" button during sprint 1.

**Where the stubs live:**
- `src/hooks/useAuth.ts` (already copied from v3, already stub)
- `src/hooks/useGlobeTheme.ts` (already copied from v3, already stub)

Do not modify these files during sprint 1.

---

## Decision 3 — URL ↔ machine sync uses "same-context no-op guard", NOT flags or refs

**Chosen:** When `navigationActor` dispatches `router.navigate()`, the resulting URL change fires `URL_CHANGED` event back to the machine. The machine compares the new URL-derived context against its current context. **If identical, no-op.** If different, update context.

**Alternative rejected:**
- `ignoreNextUrlChange` boolean flags
- `useRef` tracking "last navigation I caused"
- Debouncing URL_CHANGED events
- Any form of "did I cause this?" tracking

**Rationale:**
- Flags and refs create hidden state. Hidden state = bugs. The whole architecture is built on "reconstructible state from URL + machine context + workspace."
- "Same-context no-op" is declarative and deterministic. Same input → same decision. No timing dependencies.
- Flags lose sync under StrictMode double-invoke, React 19 concurrent rendering, route transitions that are cancelled mid-flight.
- Every real-world codebase that uses flags for this ends up with race conditions. Known anti-pattern.

**Correct pattern:**
```ts
// app.machine.ts
on: {
  URL_CHANGED: {
    guard: ({ context, event }) => {
      // Compute what context WOULD be if we processed this URL
      const wouldBe = deriveContextFromSearchParams(event.searchParams)
      // If current context matches, it's our own echo — no-op
      return !deepEqual(context.navigationContext, wouldBe)
    },
    actions: assign({
      navigationContext: ({ event }) => deriveContextFromSearchParams(event.searchParams)
    })
  }
}
```

**Helper function required:**
```ts
// src/app/deriveContextFromSearchParams.ts
export function deriveContextFromSearchParams(
  params: WorkstationSearchParams
): NavigationContext {
  // Pure function — same input always produces same output
  return {
    overlay: params.overlay ?? null,
    entityId: params.id ?? null,
    vsA: params.a ?? null,
    vsB: params.b ?? null,
    searchQuery: params.q ?? null
  }
}
```

**Rule for the sprint:**
> If Opus proposes `ignoreNextUrlChange`, `shouldSkipNextSync`, `lastNavigatedUrlRef`, or any variant of "remember I caused this" — REFUSE. Point here. The answer is: "same-context no-op guard, pure function, deterministic."

---

## Decision 4 — app.machine has exactly 4 parallel regions, no nesting

**Chosen:** Exactly this shape, no additions during sprint 1:

```
app.machine
├─ overlay (parallel)
│   └─ closed | person | company | vs
├─ search (parallel)
│   └─ closed | open
├─ auth (parallel)
│   └─ anonymous | authenticated
└─ focus (parallel)
    └─ none | entity | relation
```

**Alternative rejected:**
- Nested states (overlay → person → loading/loaded/error)
- Spawned child machines (invoke on each sub-state)
- More regions (scenario, timeline, comparison, etc.)
- History states

**Rationale:**
- Phase 2a scope is "URL sync + open/close overlays." Nothing more.
- Overlay loading states live in TanStack Query (`isLoading`, `isError`), NOT in the machine
- Child machines per overlay (person-overlay.machine.ts) spawn in Phase 6, NOT in Phase 2a
- Additional regions (scenario, comparison, timeline) are Phase 5-9 concerns
- If you find yourself wanting to add state during Phase 2a, check: can this live in `WorkspaceContext` (serializable store) or in the URL? If yes, that's where it goes.

**Canonical first iteration:**
```ts
// src/app/app.machine.ts
import { setup, assign } from 'xstate'

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent
  }
}).createMachine({
  id: 'app',
  type: 'parallel',
  context: {
    navigationContext: {
      overlay: null,
      entityId: null,
      vsA: null,
      vsB: null,
      searchQuery: null
    }
  },
  states: {
    overlay: {
      initial: 'closed',
      states: {
        closed: { on: { OPEN_PERSON: 'person', OPEN_COMPANY: 'company', OPEN_VS: 'vs' } },
        person: { on: { CLOSE_OVERLAY: 'closed', OPEN_COMPANY: 'company', OPEN_VS: 'vs' } },
        company: { on: { CLOSE_OVERLAY: 'closed', OPEN_PERSON: 'person', OPEN_VS: 'vs' } },
        vs: { on: { CLOSE_OVERLAY: 'closed', OPEN_PERSON: 'person', OPEN_COMPANY: 'company' } }
      }
    },
    search: {
      initial: 'closed',
      states: {
        closed: { on: { SEARCH_OPEN: 'open' } },
        open: { on: { SEARCH_CLOSE: 'closed' } }
      }
    },
    auth: {
      // Stub: VITE_DEV_AUTO_LOGIN=true means we start authenticated
      initial: 'authenticated',
      states: {
        anonymous: { on: { LOGIN_SUCCESS: 'authenticated' } },
        authenticated: { on: { LOGOUT: 'anonymous' } }
      }
    },
    focus: {
      initial: 'none',
      states: {
        none: { on: { FOCUS_ENTITY: 'entity', FOCUS_RELATION: 'relation' } },
        entity: { on: { FOCUS_CLEAR: 'none', FOCUS_RELATION: 'relation' } },
        relation: { on: { FOCUS_CLEAR: 'none', FOCUS_ENTITY: 'entity' } }
      }
    }
  },
  on: {
    URL_CHANGED: {
      guard: ({ context, event }) => {
        const wouldBe = deriveContextFromSearchParams(event.searchParams)
        return !deepEqual(context.navigationContext, wouldBe)
      },
      actions: assign({
        navigationContext: ({ event }) => deriveContextFromSearchParams(event.searchParams)
      })
    }
  }
})
```

**Rule for the sprint:**
> If Opus proposes any region, sub-state, or spawned machine not in the shape above — REFUSE. Point here. The answer is: "4 regions, flat, no nesting, no spawns until Phase 2b or later."

---

## Enforcement protocol

Whenever a proposal during sprint 1 involves:

1. Auth flow implementation → see Decision 2
2. Theme switcher → see Decision 2
3. searchParams validation beyond Zod → see Decision 1
4. URL sync complexity beyond same-context guard → see Decision 3
5. app.machine shape beyond 4 flat regions → see Decision 4

The agent reading this ADR MUST:
1. Stop the proposed work
2. Quote the relevant decision
3. Offer the compliant alternative
4. Proceed only with the compliant alternative

Deviation requires explicit ADR amendment from user. No implicit overrides.

---

## Amendment log

- 2026-04-16 — Initial decisions after Phase 1 completion.

(All future amendments appended here with date + rationale.)
