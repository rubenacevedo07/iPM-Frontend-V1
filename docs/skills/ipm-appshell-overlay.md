# IPM AppShell — Overlay Architecture Reference

## Overview

AppShell manages all overlay hosts. Three overlay types exist, each with a different internal layout model. Getting the layout model wrong causes panels to be invisible.

---

## AppShell overlay structure

```
AppShell
└── <AnimatePresence>  ← outer — handles whole-overlay enter/exit
    ├── {search.overlay === 'company'} → <motion.div key="overlay-company-{id}">
    │     <Suspense><CompanyOverlayHost /></Suspense>
    ├── {isGoldOpen}    → <motion.div key="overlay-gold-{id}">
    │     <Suspense><GoldOverlayHost /></Suspense>
    ├── {isHqOpen}      → <motion.div key="overlay-hq">
    │     <Suspense><HeadquartersOverlayHost /></Suspense>
    └── {isPowerMapOpen} → <motion.div key="overlay-powermap">
          <Suspense><PowerMapOverlayHost /></Suspense>
```

All outer motion.div wrappers: `initial={{ opacity:0, y:18 }}` → `animate={{ opacity:1, y:0 }}` → `exit={{ opacity:0, y:-8 }}`, duration 0.45s.

---

## OverlayPanel — THE CONTAINING BLOCK RULE

`OverlayPanel` is a `motion.div` wrapper that provides stagger animations for panels.

**CSS BUG WARNING:** When Framer Motion applies a CSS `transform` (e.g. `translateX(-16px)` during initial animation), the `motion.div` becomes a **new CSS containing block** for any `position: absolute` children (CSS spec §9.4.3). If the `motion.div` has no explicit dimensions, its size collapses to 0×0 → panels are invisible.

### Rule: absolutely-positioned panels MUST have `position: absolute; inset: 0`

```tsx
// ❌ WRONG — .co-hdr (position:absolute) collapses to 0×0 during animation
<OverlayPanel dir="up" delay={0}>
  <CompanyHeaderRow />
</OverlayPanel>

// ✅ CORRECT — OverlayPanel fills its container, absolute children work
<OverlayPanel dir="up" delay={0} style={{ position: 'absolute', inset: 0 }}>
  <CompanyHeaderRow />
</OverlayPanel>
```

### When is `inset: 0` NOT needed?

When the panel uses **CSS grid or flex layout** (children are in normal flow):
- `GoldOverlay` — uses `.gov__root` CSS grid → no `inset: 0` needed on OverlayPanel
- `HeadquartersView` — uses `.sr__root` CSS grid → no `inset: 0` needed

When the panel uses **absolute positioning** (children are out of flow):
- `CompanyOverlayHost` — ALL panels use `position: absolute` → **requires `inset: 0`**

---

## Three overlay layout models

### 1. GoldOverlay (`src/features/gold-overlay/GoldOverlay.tsx`)
```
.gov__root (CSS grid, 3 columns)
├── OverlayPanel dir="left" delay={0}  className="gov__panel-wrap"
├── OverlayPanel dir="down" delay={0.16} className="gov__bottom"
└── OverlayPanel dir="right" delay={0.08} className="gov__right"
```
Grid layout → normal flow → `inset: 0` NOT required.

### 2. HeadquartersView (`src/features/headquarters-overlay/HeadquartersView.tsx`)
```
.sr__root (CSS grid, 3 columns)
├── OverlayPanel dir="left" delay={0}    — CompactProfilePanel
├── OverlayPanel dir="down" delay={0.06} — HeadquartersCenter
└── OverlayPanel dir="right" delay={0.12} — CompactCompanyPanel
```
Grid layout → normal flow → `inset: 0` NOT required.

### 3. CompanyOverlayHost (`src/app/CompanyOverlayHost.tsx`)
```
<div position:absolute inset:0 pointerEvents:none>   ← root container
  <button × zIndex:70 pointerEvents:auto />          ← close button
  <CompanyGlobe />                                   ← data feeder
  <AnimatePresence>                                  ← inner — tab-switch animations
    <OverlayPanel inset:0 pointerEvents:auto>        ← .co-hdr (position:absolute top:0)
    <OverlayPanel inset:0>                           ← .co-sub (position:absolute top:71px)
    <OverlayPanel inset:0>                           ← .co-first (position:absolute left:0)
    <OverlayPanel inset:0>                           ← SecondPanel (position:absolute right:0)
  </AnimatePresence>
</div>
```
Absolute-positioned panels → **ALL OverlayPanel wrappers require `inset: 0`**.

**Inner AnimatePresence** handles tab-switch exit/enter animations (key includes `activeTab`).
**Outer AppShell AnimatePresence** handles whole-overlay enter/exit.

---

## Pointer-events pattern

```
CompanyOverlayHost root div: pointerEvents: 'none'
  ├── close button (×): pointerEvents: 'auto'  zIndex: 70
  ├── OverlayPanel header: pointerEvents: 'auto'   ← tabs need clicks
  ├── OverlayPanel sub:    (inherits none)          ← display only
  ├── OverlayPanel first:  (inherits none)          ← .co-first { pointer-events: none }
  └── OverlayPanel second: (inherits none)          ← SecondPanel { pointerEvents: 'none' }
```

The header OverlayPanel has `inset: 0` + `pointerEvents: auto`. This makes it full-screen and interactive. The close button has `zIndex: 70` so it stays on top (clickable above the full-screen header wrapper).

---

## AppShell — which hooks are used where

| Hook | Used in | NOT used in |
|------|---------|-------------|
| `usePersonsMap()` | AppShell (globe entities) | — |
| `useCompanies()` | CompanyOverlayHost (`companyById` memo) | **AppShell** |
| `useCompanyById()` | CompanyOverlayHost | — |

**Do NOT add `useCompanies()` to AppShell.** Globe entity data comes from:
1. Static JSON: `fetch('/data/top30.json')` → `top30Data` → `top30` useMemo
2. API: `usePersonsMap()` → `top15persons` useMemo

---

## Common mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| OverlayPanel without `inset:0` wrapping `position:absolute` panels | Panels invisible when overlay opens | Add `style={{ position:'absolute', inset:0 }}` |
| `useCompanies()` in AppShell | TypeScript `noUnusedLocals` error | Remove — not needed in AppShell |
| AnimatePresence with plain `<div>` children (not motion.*) | No enter/exit animation | Use OverlayPanel (IS a motion.div) |
| Inner AnimatePresence unmounts with parent | Exit animations lost on overlay close | Exit is handled by outer AppShell AnimatePresence |
