---
name: GraphFlow Project Overview
description: GraphFlow is a React 19 graph visualization app for financial entities/networks with ReactFlow, Tailwind v4, and shadcn/ui
type: project
originSessionId: a70aa136-216a-41ad-bdf6-2d3d3e3d3351
---
## What It Is
GraphFlow is a **financial entity relationship visualization tool** built with React 19 + ReactFlow v11. It visualizes complex networks of entities (companies, people, financial instruments) and their interconnections.

## Core Technologies
- **Framework:** React 19.2.5 + TypeScript 6.0.2
- **Graph Visualization:** ReactFlow 11.11.4 (canvas-based node/edge system)
- **Styling:** Tailwind CSS v4 + shadcn/ui (48 pre-built components)
- **Build:** Vite 8.0.10 with Babel React Compiler optimization
- **UI Primitives:** Radix UI (accessible headless components)

## Key Features
1. **Orbital Graph Layout** — Central subject node (Ring 0) → Ring 1/Ring 2 entities in circular orbits
2. **Spotlight System** — Hover any node to dim non-connected entities, brighten connections
3. **Floating Panels** — Click nodes to reveal rich detail panels (DossierPanel) with metadata/timelines
4. **Edge Metadata** — Animated edges with glow effects; edges show relationship type on hover
5. **Rich Animations** — Radar sweeps, pulse rings, particle flows, orbital spins (CSS keyframes)

## Main Components
- **PerfectGraphCanvas.tsx** (1661 lines) — Core graph renderer + state management
- **DossierPanel.tsx** (563 lines) — Entity detail drawer (right sidebar)
- **ReactFlow customizations** — Custom nodes (YouNode, PerfectNode) + edges (StraightGlowEdge)
- **shadcn/ui components** — 48 pre-built UI components in src/components/ui/

## Color System
- **Cyan (#00E5FF):** Primary accent (selected, highlighted)
- **Amber (#f59e0b):** Warnings/high risk
- **Green (#22c55e):** Success/low risk
- **Gray (#94a3b8):** Neutral states
- **Dark Blue (#0A0E14):** Canvas background

## Known Issues & Compatibility
- **React 19 + ReactFlow v11 warning:** StrictMode double-invokes effects, triggering false positive nodeTypes/edgeTypes warning. No functional impact.
- **Tailwind v4 setup:** Requires `@tailwindcss/vite` plugin + imports in main.tsx (recently fixed)
- **Container sizing:** ReactFlow parent must have explicit width/height CSS

## Quick Dev Workflow
```bash
npm install              # Install all deps
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # TypeScript check + prod build
npm run lint             # ESLint + TypeScript ESLint
```

## File Organization
- `src/components/` — React components (graph, panels, UI)
- `src/styles/` — CSS (Tailwind, theme variables, fonts)
- `vite.config.ts` — Vite + Tailwind + Babel config
- `CLAUDE.md` — Complete technical documentation (see this for full details)

## What to Document When Returning
- Any breaking changes to color tokens or typography
- New component types added to ReactFlow
- Performance issues or animation jank (check React DevTools profiler)
- CSS/Tailwind utility changes
