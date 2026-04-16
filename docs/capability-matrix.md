# Capability Matrix — Source of Truth per Piece

**Purpose:** Document which version of which project each piece of V1 is copied from, and the reasoning.
**Updated:** During Phase 1 file-by-file verification.

## The Three Source Projects

| Project | Path | Status |
|---|---|---|
| v1 ovni | `react-ovni/` | Prototype. First globe + entity concept. |
| v2 frontend | `frontend/` | Working version. Mature `globalCompanies`, SearchBar, hooks, apiClient. |
| v3 IPM_Frontend | `IPM_Frontend/` | Failed integration. Best state machines, explicit types/services, person-overlay v10, globe cinematic, ArcLayer. |

## Capability Matrix

| Capability | v1 ovni | v2 frontend | v3 IPM_Frontend | V1 uses | Why |
|---|---|---|---|---|---|
| globalCompanies overlay | v1 (basic) | **v3 most mature ✓** | v2 | **v2 frontend** | v2's `globalCompanies/` (22 files) is the production-tuned version |
| Person overlay | — | v2 (basic) | **v10 ✓** | **v3 IPM_Frontend** | v10 is the target design with nested state machine |
| State machines | — | partial | **complete ✓** | **v3 IPM_Frontend** | v3 has the full `app.machine.ts`, `entity-inspector`, `graph-interaction`, `tabs` |
| Services layer | — | ✓ | **✓ best structured** | **v3 IPM_Frontend** | More explicit, cleaner layering (drop nested `services/services/`) |
| Types | — | ✓ | **✓ most explicit** | **v3 IPM_Frontend** | Domain types more granular (drop nested `types/types/`) |
| Hooks | ✓ (basic) | **✓✓ canonical** | ✓ (forked) | **v2 frontend** | v2 is canonical; v3 duplicates them |
| apiClient.ts | — | **✓ with token refresh** | forked | **v2 frontend** | v2 has token refresh + 401 handling; v3's fork lost it |
| SearchBar / SearchOverlay | — | **✓** | partial | **v2 frontend** | v2 functional; v3 half-done |
| Globe cinematic + video intro | — | — | **✓ (MapPage + MapCinematicIntro)** | **v3 IPM_Frontend** | Only source |
| ArcLayer | — | — | **✓ (RelationArcLayer)** | **v3 IPM_Frontend** | Only source |
| Design tokens | — | **✓** | copy of v2 | **v2 frontend** | `shell/tokens.ts` original |
| Dashboard shell | experimental | ✓✓ | — | **not used in V1** | V1 is globe-first single shell |
| Landing pages | — | ✓ | — | **out of sprint** | Sprint 2+ |

## Phase 1 File-Level Decisions (filled during execution)

### types/
| File | Source | Reasoning |
|---|---|---|
| `person.ts` | tbd | |
| `company.ts` | tbd | |
| `country.ts` | tbd | |
| `graph.ts` | tbd | |
| `timeline.ts` | tbd | |
| ... | | |

### services/
| File | Source | Reasoning |
|---|---|---|
| `api/apiClient.ts` | v2 | canonical, token refresh |
| `personService.ts` | tbd | |
| `companyService.ts` | tbd | |
| ... | | |

### hooks/
| File | Source | Reasoning |
|---|---|---|
| `useCompanyById.ts` | v2 | canonical |
| `usePersonData.ts` | v2 | canonical |
| `usePersonIntelligence.ts` | v2 | canonical |
| ... | | |

## Cleanup Notes

**v3 has accidental nested folders:** `services/services/`, `hooks/hooks/`, `types/types/`.
When copying from v3: take outer-level files only. Drop the nested copies — they are stale duplicates.

Verify absence in V1:
```bash
# These commands should return NOTHING in V1 after Phase 1
find src/services -type d -name services
find src/hooks -type d -name hooks
find src/types -type d -name types
```
