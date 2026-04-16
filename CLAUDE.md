## Skill hierarchy (load by reading docs/skills/*)
When working on architecture → read docs/skills/ipm-v4-core-architect.md
When working on engines/runtime → read docs/skills/ipm-engine-runtime.md
When working on data pipeline → read docs/skills/ipm-data-fusion-enforcer.md
When resuming the sprint → read docs/skills/ipm-frontend-v1-sprint.md
Architectural rules → read docs/skills/ipm-frontend.md

## The six non-negotiable rules
1. NO handwritten types...
2. NO fetch() outside apiClient.ts...
(las 6 reglas inline aquí, para que estén siempre en contexto)

## Current sprint phase
Read docs/skills/ipm-frontend-v1-sprint.md for the live progress tracker.

### Globe layer budget (strict)
- Entity dots: ~100 total (30 persons + 30 companies + 40 chokepoints/facilities)
- Country risk fills: ONLY countries with RiskScore > 60
- Country fill opacity: max 0.25 (subtle, not political-map look)
- Target: sustained 60fps on rotation with all layers active
- If framerate drops below 50fps, reduce dot count before adding layer optimization