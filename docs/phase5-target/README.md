# Phase 5 Target — V3 Port

## Source of truth
- Canonical: `C:\Users\ruben\source\repos\iPM_GV\IPM_Frontend\src\features\company-overlay\globalCompanies\`
- Reference screenshots: see `./screenshot-microsoft-2026-04-13.png` and `./screenshot-mediatek-2026-04-03.png`

## Target layout
- Header row: logo + name + sector pill + country + CEO + employees + tabs (Overview / Trader View / Analyst / Predictions)
- Sub-header row: MARKET CAP / REVENUE / NET INCOME + pills (LIVE DATA / SPHERE VIEW / [sector tag])
- LEFT panel — OPERATIONS: MARKETS · FACILITIES · PRODUCTS
- CENTER: globe (3D) or map (2D) depending on company
- RIGHT panel — NETWORK: TOP SUPPLIERS · TOP CLIENTS (optionally tabs NETWORK / MARKETS / SECTORS)

## Scope decision (Opción C)
- Copy globalCompanies WITHOUT TraderViewPanel
- Tabs Trader View / Analyst / Predictions remain as buttons with no content
- TraderViewPanel + charts/* deferred to Phase 5.2 (avoids missing chart deps)

## Deps to install
- framer-motion
- chart.js (deferred)
- react-chartjs-2 (deferred)
- flag-icons

## Out of scope for Phase 5
- Trader View / Analyst / Predictions tab content
- Any v2 content (v2 is explicitly NOT the source of truth)
- TraderViewPanel and its chart dependencies
