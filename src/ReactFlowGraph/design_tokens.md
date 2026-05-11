---
name: GraphFlow Design Tokens & Styling Reference
description: Complete color palette, typography, spacing, shadows, and animation values used throughout GraphFlow
type: reference
originSessionId: a70aa136-216a-41ad-bdf6-2d3d3e3d3351
---
## Color Tokens (Hex Values)

### Primary Palette
```
Cyan (Primary):     #00E5FF  // Selected, highlighted, primary actions
Amber (Warning):    #f59e0b  // Warnings, medium risk, attention
Orange (Alert):     #FF5A00  // High alerts, critical states
Green (Success):    #22c55e  // Completed, low risk, positive
Gray (Neutral):     #94a3b8  // Neutral, disabled, secondary states
Dark BG:            #0A0E14  // Canvas background (very dark blue)
Text Light:         #E2E8F0  // Primary text
Text Muted:         #CBD5E1  // Secondary text
```

### Color Maps by Context

**Type Accent (Node Types):**
```javascript
primary:   color: '#00E5FF', glow: 'rgba(0,229,255,0.18)'
warning:   color: '#f59e0b', glow: 'rgba(245,158,11,0.18)'
success:   color: '#22c55e', glow: 'rgba(34,197,94,0.18)'
secondary: color: '#94a3b8', glow: 'rgba(148,163,184,0.12)'
default:   color: '#fbbf24', glow: 'rgba(251,191,36,0.14)'
```

**Connection Badges (CLR in DossierPanel):**
```javascript
cyan:   { text: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.35)' }
green:  { text: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' }
amber:  { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)' }
yellow: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.35)' }
gray:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.25)' }
```

**Risk Levels:**
```javascript
HIGH: '#f59e0b' (Amber)
MED:  '#22d3ee' (Cyan)
LOW:  '#22c55e' (Green)
```

---

## Typography

### Font Families
```
Rajdhani:        Display/headings (500, 600, 700 weights)
DM Sans:         Body/UI text (300, 400, 500 weights)
DM Mono:         Monospace/labels (400, 500 weights)
JetBrains Mono:  Code/technical text (monospace)
```

### Font Sizes & Weights
```
Heading (Node):   13px, 700, Rajdhani
Panel Title:      18px, 600, Rajdhani
Body:             12px, 500, DM Sans
Label/Badge:      8-9px, 600, DM Mono, tracking 0.08-0.14em
Small Text:       10-11px, 400-500, various
```

---

## Spacing Values

```
8px    - Small element spacing (icon + label)
10px   - Compact sections
12px   - Medium spacing
14px   - Panel sections / margins
16px   - Major separation / padding
20px   - Large gaps
```

---

## Border Radius

```
2px    - Minimal (badges, progress bars)
3px    - Small buttons/borders
4px    - Standard (Tailwind default)
6px    - Cards/panels (small)
8px    - Panels, nodes (standard)
10px   - Large panels (Dossier)
12px   - Extra large
50%    - Circles (avatars, rings)
```

---

## Shadows & Glows

### Box Shadows
```javascript
Panel Glow:      '0 8px 32px rgba(0,0,0,0.6)'
Deep Panel:      '0 12px 40px rgba(0,0,0,0.8)'
Node Glow:       '0 0 24px rgba(0,229,255,0.45)'
Hover Lift:      '0 4px 16px rgba(color,0.3)'
Subtle Shadow:   '0 2px 8px rgba(0,0,0,0.3)'
Inner Highlight: 'inset 0 1px 0 rgba(255,255,255,0.03)'
```

### SVG Filters (Edge Glows)
```xml
<feGaussianBlur stdDeviation={2-4} />  // Softness
<feMerge>                               // Layer blending
  <feMergeNode in="SourceGraphic" />
  <feMergeNode in="blurred" />
</feMerge>
```

---

## Animations & Transitions

### Keyframe Durations
```
2s      - Edge pulses, standard animations
3s      - Node radar animations
3.8s    - YouPulse (central node expansion)
6s      - RadarSweep (slowest orbital element)
0.15s   - Quick UI transitions
0.22s   - Standard easing
0.3s    - Medium transitions
```

### Ease Functions
```
ease               - Default smooth (cubic-bezier(0.25, 0.1, 0.25, 1))
ease-in-out        - Symmetrical acceleration/deceleration
ease-out           - Deceleration (natural feel)
linear             - Constant speed (particle flows)
cubic-bezier(0.16,1,0.3,1)  - Bounce-like smooth
```

### Keyframes Defined
```
orbitalSpin        - Ring rotates continuously
youPulse           - Central node pulses (expand/contract)
radarSweep         - Radar line sweeps (6s)
particleFlow       - Particles move along edge path
edgePulse          - Edge glow pulses on hover
edgeSelectPulse    - Selected edge endpoint pulses (2s)
dossierSlideIn     - Panel entrance (0.3s)
miniPanelIn        - Sub-panel scale + translate
```

---

## Glass Morphism

```javascript
backdrop-filter: 'blur(14px)'       // Dossier panel
background: 'rgba(10,18,32,0.94)'  // 94% opacity dark + blur
border: '1px solid rgba(0,229,255,0.3)'  // Cyan tint border
```

---

## CSS File Reference

| File | Purpose |
|------|---------|
| `src/index.css` | CSS variables, typography baseline (112 lines) |
| `src/styles/tailwind.css` | Tailwind v4 directives, custom utilities (28 lines) |
| `src/styles/fonts.css` | Google Fonts @import |
| `src/styles/theme.css` | Light/dark OKLch colors (legacy) |

---

## Tailwind Integration Notes

- **Framework:** Tailwind CSS v4 (not v3)
- **Config:** Inline via `@theme` in CSS (no tailwind.config.js)
- **Plugin:** `@tailwindcss/vite` in vite.config.ts
- **Content Scanning:** Automatic via `@source` directive
- **Usage:** `w-full h-screen` classes in PerfectGraphCanvas, shadcn/ui utilities

---

## Customization Tips

### To Change Primary Color Globally
1. Edit `src/index.css` CSS variables
2. OR update color maps in components (TYPE_ACCENT, CLR, RISK_CLR)
3. OR modify `@theme` in `src/styles/tailwind.css`

### To Adjust Typography
1. Edit Google Fonts weights in `src/styles/fonts.css`
2. Modify font-size/weight in component inline styles
3. Update base in `src/index.css`

### To Speed Up Animations
1. Reduce duration: 2s → 1.5s (shorter)
2. Change ease function: ease-in-out → linear (snappier)
3. Adjust via `@keyframes` in component `<style>` tags

---

## Deprecated / Legacy

- `default_shadcn_theme.css` — Fallback theme (not actively used)
- `src/styles/globals.css` — Old global styles (kept for reference)
- ParticleFlowEdge — Old edge type (StraightGlowEdge is standard now)
