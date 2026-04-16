# OPUS_CONTEXT — Cold Start Brief

**For Claude Opus at session start.** Read this first. Full detail lives in `CLAUDE.md` (auto-loaded) and `docs/skills/`.

---

## You are

Claude Opus, working on **iPM_Frontend_V1** — a globe-first intelligence workstation MVP rebuild. This is sprint 1 of 2 (~40h / ~12 days).

## Current state

- **Phase:** NONE — project not yet scaffolded
- **Repo status:** docs complete, no `package.json`, no `src/`, no `node_modules`
- **Backend:** must be running at `https://localhost:32771` (self-signed cert) before Phase 0

## Load order (first turn of any session)

1. **`CLAUDE.md`** — auto-loaded by Claude Code. Contains the six rules, capability matrix, scope, red flags.
2. **`docs/skills/ipm-frontend-v1-sprint.md`** — live sprint tracker. Read to find current phase and resume point.
3. **On demand only** — the other four skills (`ipm-v4-core-architect.md`, `ipm-engine-runtime.md`, `ipm-data-fusion-enforcer.md`, `ipm-frontend.md`) when the task touches that layer.

## First action

Execute **Phase 0** per the checklist in `docs/skills/ipm-frontend-v1-sprint.md`.

**Do NOT start Phase 1 until the user confirms Phase 0 passes.**

## Before writing any code — verify

- [ ] Backend responds: `curl -k https://localhost:32771/api/persons/7` → returns Elon Musk JSON
- [ ] Browser accepted self-signed cert once (user visited `/swagger` and clicked through warning)
- [ ] `.env` is in `.gitignore` and NOT tracked by git (`git ls-files | grep env` returns nothing)
- [ ] OpenAI API key in `.env` is the FRESH one (user rotated after previous exposure)

If any of the above fails, **stop and ask the user** before proceeding.

## The six hard rules (see CLAUDE.md for full reasoning)

1. **No handwritten types** — copy from v2/v3 verbatim
2. **No `fetch()` outside `apiClient.ts`** — from v2, handles token refresh
3. **No duplicate hooks** — grep v2 `hooks/` first, 53 already exist
4. **No refactoring copied components** — adapt imports only, never logic
5. **No DTOs in UI or engines** — pipeline is `services → mappers → ViewModels → EngineBridge → EngineInput`
6. **No React in engines** — Three.js vanilla for GraphEngine, `new Deck({...})` for GlobeEngine. No R3F, no `<DeckGL />` wrapper

## Red flags — stop immediately

- Tempted to install `openapi-typescript` → violates Rule 1
- Tempted to write inline `fetch(` → violates Rule 2
- Tempted to invent a hook "because it's almost the same" → violates Rule 3
- Tempted to "clean up" a copied component → violates Rule 4
- Tempted to import raw DTO types into `features/` or `engine/` → violates Rule 5
- Tempted to use R3F "because it's cleaner" → violates Rule 6
- Setting `secure: true` in Vite proxy → breaks self-signed cert, silent 502s
- Writing new code when a v2/v3 source exists → STOP, search, copy

## Source-of-truth repos on disk

- v2: `C:\Users\ruben\source\repos\iPM_GV\frontend\`
- v3: `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend\`
- Backend: `C:\Users\ruben\source\repos\iPM_GV\IPM_Backend\`

Which piece comes from where: `CLAUDE.md` → Capability Matrix, and `docs/capability-matrix.md` for file-level detail.

## Confirmed backend shapes (verified Phase 0)

- `GET /api/persons/7` → Elon Musk, camelCase, has `fullName`, `photoUrl`, `nodeId`, `countryLat/Lng`
- `GET /api/companies/1` → NVIDIA, camelCase, has noise fields (`alphaAnnualEarnings[]`, etc.) that mappers must filter
- `GET /api/persons/{id}/intelligence` → `PersonIntelligenceDto` aggregate, direct mapper target

## At session end

Before finishing any session, update `docs/skills/ipm-frontend-v1-sprint.md`:

1. `Last updated` date
2. `Current phase` and position inside it
3. Checkbox for any phase just completed
4. Gate status if crossed (A/B/C)
5. One-paragraph session note: what done, what broke, what next

Commit: `chore(sprint): update progress — phase N`.

This makes the next session's first action trivial — "read CLAUDE.md, read sprint tracker, resume".
