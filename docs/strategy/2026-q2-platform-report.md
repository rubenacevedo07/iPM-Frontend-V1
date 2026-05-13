# IPM Platform — Strategic Report Q2 2026

> **Living document** — review and update each quarter. Last edition: 2026-05-12.
>
> Audience: leadership (CEO / CTO / Head of Product / Sales). Engineers should
> treat sections 2 and 3 as authoritative product surface inventory.

---

## TL;DR

Hoy tenés una plataforma de visualización de inteligencia relacional con
arquitectura modular probada. El core (engine plugin pattern + graph data
layer + 5 tipos de overlays + 7 powermaps curados) es **vertical-agnostic** —
el 70-80% del código se reutiliza en banking, logística, fleet, corporate
control y healthcare cambiando solo entity types + configs + backend
endpoints.

- **Time-to-MVP por vertical nuevo:** 4-8 semanas.
- **Modelo de monetización más rentable año 1:** 60% SaaS per-seat + 30%
  Enterprise white-label + 10% PowerMap Marketplace (innovador).
- **Decisión clave:** banking primero como adyacencia natural (comparte
  vocabulario: sanctions, exposure, networks). LOI piloto vendible en 90 días.

---

## 1. Qué tenemos hoy

### 1.1 Stack técnico (production-grade)

| Capa | Tech | Madurez |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 8 | ✓ Stable |
| Routing | TanStack Router (URL = source of truth) | ✓ Stable |
| State | XState v5 (4 parallel regions + engine manager + entity inspector) | ✓ Stable |
| Data | React Query + `apiClient` (single egress, Rule 2) | ✓ Stable |
| Geo engine | **deck.gl 9 imperative** (no R3F, custom rAF rotation) | ✓ Stable |
| Graph engine | **@xyflow/react** + d3-force | ✓ Stable |
| Macro graph | **three.js GraphBridge** (skeleton, 256+ entities) | ⚠️ Skeleton |
| Animations | Framer Motion (mirror cinematic, persistent panels) | ✓ Stable |

### 1.2 Pantallas y features actuales

**Pantalla principal `/workstation`** — canvas único con tabs:

```
┌───────────────────────────────────────────────────────┐
│  TopBar (search → activa powermaps por nombre)        │
├──────────┬─────────────────────────────────┬──────────┤
│ PowerMaps│                                 │          │
│  Panel   │     Globe (deck.gl)             │          │
│ (7 narr- │     ↕ persistent panel ↕        │          │
│ ativas)  │     Network (xyflow)            │          │
│          │                                 │          │
├──────────┴─────────────────────────────────┴──────────┤
│  Atlas Tabs HUD: Globe · Network · Force · Studio ·   │
│  Wall Street                                          │
└───────────────────────────────────────────────────────┘
         ↑ overlays flotan (z-index 50, glass UI):
         · Gold (Person)     · Company
         · StudioRelation    · PowerMapOverlay
         · Headquarters dual (CEO + empresa)
```

**Inventario de features actuales (snapshot 2026-05-12):**

| # | Feature | Estado |
|---|---|---|
| 1 | Globo 3D rotatorio con países, dots, arcos | ✓ Production |
| 2 | Network graph (xyflow) con layout orbital + force | ✓ Production |
| 3 | Cinematic transitions Globe ↔ Network (mirror gesture) | ✓ Production |
| 4 | 7 PowerMaps curados (Hormuz, Wall Street, Taiwan, German Industries, AI, BlackRock, Iran-USA) | ✓ Production |
| 5 | Wall Street view didáctica con 4 modos (Sugiyama, Command Chain, Passive Money, Advanced) | ✓ Production |
| 6 | Person Gold Overlay (intelligence, sectors, signals, neighbors, news) | ✓ Production |
| 7 | Company Overlay (suppliers, clients, fabrics, market continents) | ✓ Production |
| 8 | Studio Relation (person↔person comparative) | ✓ Production |
| 9 | Headquarters Dual Overlay (CEO + empresa) | ✓ Deep-link funcional, click trigger TODO |
| 10 | Search → PowerMap activation | ✓ Production |
| 11 | Globe → PowerMap fly-to cinematic | ✓ Production |
| 12 | URL deep-linking + back-button history para todos los overlays | ✓ Production |
| 13 | Top 30 companies + top 15 persons en globo (lazy loaded) | ✓ Production |
| 14 | Hover tooltip + cursor pointer | ✓ Production |
| 15 | Auto-rotation con stop-on-selection (Rule 7) | ✓ Production |

**Capacidades del backend** (intelligence layer):

- 256+ company logos + 49 person photos servidos estáticamente
- Endpoint `/graph/node/{id}/neighbors` con envelope shape, 1-hop edges
- Endpoint `/persons/top15` con datos enriquecidos (composite score, country coords, photo, role)
- Endpoint `/companies/{id}` con intelligence completo
- Endpoint `/relations/analyze` para análisis de relación entre dos entidades
- Composite scores, archetypes, sectors, news signals por entidad

---

## 2. Strategic strengths (lo que NO es trivial replicar)

1. **Engine plugin pattern** (`IEngineBridge`) — 3 engines hoy (globe, graph
   xyflow, graph three.js). Cambiar engine = drop-in. Sin tocar UI/state.
   - **Valor**: cualquier visualización nueva (mapa indoor, treemap, sankey)
     entra como engine sin refactor.

2. **PowerMaps como narrativas configurables** — cada powermap = config en
   `POWER_MAP_CONFIGS` (3 a 50 líneas) + opcional `networkComponent`. Nueva
   narrativa = 1 entrada al config. Cero código.
   - **Valor de negocio**: las narrativas son la **unit-of-sale** vendible —
     un cliente paga por la "Wall Street lens" o la "Suez 2024 lens".

3. **URL como single source of truth** — cualquier estado de UI es
   bookmarkable, shareable, embebible.
   - **Valor**: deep-linking en reportes externos, integración trivial con BI
     tools (Slack/Notion previews).

4. **Composition over polymorphism** — `CompactProfilePanel` (persona) +
   `CompactCompanyPanel` (empresa) son siblings, no un componente polimorfo
   con boolean props.
   - **Valor**: agregar `CompactVehiclePanel`, `CompactAccountPanel`,
     `CompactPropertyPanel` toma horas, no días.

5. **Performance budget cumplido** — 60fps en globo con rotación + 45
   entidades + capas de países + arcos. First click → overlay open <300ms.
   Vite optimizeDeps pre-bundlea libs pesadas.
   - **Valor**: vendible a clientes con expectativas tipo Bloomberg Terminal.

6. **6 architectural rules enforced** (no handwritten types, single-writer
   URL, no R3F, etc.).
   - **Valor**: deuda técnica controlada. Onboarding de nuevos devs es rápido.

7. **Persistencia inteligente para IA** — memory layer
   (`~/.claude/projects/.../memory/`), logs diarios (`.log/`), plans
   (`~/.claude/plans/`).
   - **Valor**: ramp-up acelerado en cualquier sesión nueva. El proyecto es
     "AI-native" en mantenimiento. Velocidad de iteración compuesta.

---

## 3. Producto base + targets actuales

**Pitch en 1 línea**: Globe + Network + Overlays + PowerMaps para entender
redes complejas de poder, dinero y geografía a través de narrativas curadas.

**Targets actuales** (geopolitical intelligence):

- Government / Intel agencies — sanctions analysis, threat actor mapping
- Defense contractors — supply chain risk
- Investment funds — geopolitical alpha
- Journalism / OSINT — investigative leads

---

## 4. Verticales adyacentes — playbook de reutilización

El patrón es **siempre el mismo**:

1. Cambiar entity types en `src/types/_ext/`
2. Swap `POWER_MAP_CONFIGS` por configs verticales
3. Swap overlay components (siguen el pattern de `CompactProfilePanel`)
4. Swap backend endpoints (apiClient = single change point)

| Vertical | Globe usa | Network usa | PowerMaps reskin | Overlay primario | Time-to-MVP |
|---|---|---|---|---|---|
| **Banking / AML** | Sucursales, hot zones de fraude | Counterparty graph, ownership chains | "OFAC Sanctions Lens", "AML High-Risk Jurisdictions" | Client + UBO dual overlay (mismo patrón que HQ) | **5 sem** |
| **Logística / Supply Chain** | Warehouses, puertos, rutas en vivo | BOM dependency graph | "Suez", "Panama", "Hormuz" (ya hecho!), "Taiwan chips" | Supplier + Plant dual overlay | **4 sem** (más reuse) |
| **Car Rental / Fleet** | Vehículos en tiempo real, demanda por ciudad | Customer ↔ Agent ↔ Vehicle | "Airport Premium Zones", "Holiday Demand Surge" | Vehicle + Agency dual overlay | **6 sem** |
| **Corporate Control / M&A** | Subsidiary footprint | Cap table, board interlocks, M&A history | "Antitrust hotspots", "ESG exposure" | Parent + Subsidiary dual overlay | **5 sem** |
| **Pharma / Medical Affairs** | Clinical trial sites, prescription density | KOL influence networks | "FDA pipeline 2026", "Oncology TA dominance" | KOL + Institution dual overlay | **7 sem** |
| **Energy / Commodities** | Producers, refineries, flow arcs | Hedge positions, trading counterparties | "OPEC+ dynamics", "LNG flow shifts" | Producer + Refinery dual overlay | **5 sem** |
| **Real Estate / Urban** | Property values, density choropleths | Owner chains, developer networks | "Foreign capital flows", "Zoning hotspots" | Property + Owner dual overlay | **6 sem** |

**Capacidad combinada**: con un equipo de 3 frontend + 2 backend + 1 designer,
podríamos shippear **2 verticales por trimestre** una vez consolidado el
primero adyacente (banking sería el natural).

---

## 5. Monetización — 5 modelos viables

### A) SaaS per-seat tiered (recomendado primario)

- **Analyst**: $200-500/mes — acceso al core + 3 PowerMaps standard
- **Pro**: $1k-2k/mes — todo + custom alerts + API limitada
- **Enterprise**: $50k+/año — white-label, custom narrativas, SSO, audit log
- **Comparables**: Palantir Foundry $50-200k/año, Bloomberg Terminal
  $24k/año, Cambridge Intelligence $40-100k/año

### B) PowerMap Marketplace (innovación)

- Cada narrativa curada vendida individual: $5k-50k según profundidad
- Modelo: nosotros producimos 60%, expertos externos producen 40% con
  rev-share 70/30
- Ejemplo: "Iran-USA Q3 2026 lens" $15k, "Suez Disruption Toolkit" $25k
- **Diferenciador**: ningún competidor vende narrativas como producto

### C) Vertical Editions (white-label)

- iPM Banking Edition, iPM Logistics Edition, etc.
- Licencia + customización: $100k-500k de set-up + $30-100k/año
- Targets: bancos tier-2, navieras, fleet managers

### D) API / Embed Layer

- Acceso al graph data + overlay components como SDK
- $0.10-1.00 por query (escalable)
- Targets: BI vendors, news rooms, fintechs que necesitan visualización rápida

### E) Data licensing

- El graph de entidades en sí (40k personas + 256 companies + relaciones)
  como dataset
- $10-50k/año por sector

**Mix recomendado año 1**: 60% SaaS + 30% Enterprise white-label + 10%
Marketplace (proof-of-concept para ver elasticidad).

---

## 6. Competitive positioning

| Competidor | Lo que hacen mejor | Donde ganamos nosotros |
|---|---|---|
| **Palantir Foundry** | Datos + consultoría | Lighter, web-first, 1/10 del precio, **sin requisito de implementación de 6 meses** |
| **Bloomberg Terminal** | Profundidad de mercados financieros | Network-centric vs price-centric. Visual storytelling > tablas |
| **Cambridge Intelligence (KeyLines/ReGraph)** | SDK profesional para grafos | Producto end-to-end **out of the box** + narrativas curadas |
| **Maltego** | OSINT investigations | UX moderna (web vs desktop), narrativas, mejor a escala |
| **Visual Capitalist / Statista** | Storytelling estático | Nosotros somos **interactivos, en vivo, con datos propios** |

**Diferenciador único**: somos el único que combina (a) globo geográfico
interactivo + (b) network graph + (c) intelligence panels + (d) narrativas
curadas vendibles, todo en una sola URL.

---

## 7. Riesgos / lo que NOS FALTA

1. **Auth + multi-tenant** — hoy es single-user mock. Necesitamos OIDC +
   workspace boundaries. **~6 semanas.**
2. **Real-time updates** — todo es polling React Query. WebSocket para
   alertas vivas en alguna vertical (logistics, fleet). **~4 semanas.**
3. **Mobile** — la UI no es responsive aún. Tablet a 1024px+ funciona, móvil
   no. **~8 semanas si decidimos que importa.**
4. **Internacionalización** — strings hardcoded en EN/ES. **~3 semanas para
   i18n setup.**
5. **Export / report generation** — no hay export de PDFs/PowerPoints. **~4
   semanas.** Crítico para enterprise B2B.
6. **Backend escalability** — los endpoints siguen siendo single-instance.
   Para >100 concurrent users hace falta horizontal scaling + Redis cache.
   **~8 semanas + infra.**
7. **Data freshness pipeline** — el dataset es snapshot. Para mantener
   "current" necesitamos ingest automatizado (LLM-based news → entity
   updates). **~12 semanas para v1.**

**Decisión clave para CEO**: ¿queremos profundizar verticalmente en
geopolitical-intel (donde ya tenemos producto) o priorizar adyacencia
(banking primero)? Mi lectura: **banking primero como adyacencia**, porque
comparte vocabulario (sanctions, exposure, networks) con lo que ya tenemos.
Cliente piloto vendible en 90 días.

---

## 8. Recomendación de los próximos 90 días

| Semana | Foco | Entregable |
|---|---|---|
| 1-2 | Cerrar HQ overlay bidirec + click trigger + completar smoke tests | iPM core v1.0 release-ready |
| 3-4 | Auth + multi-tenant básico (Auth0 o Clerk) | Demo-able a clientes |
| 5-8 | **Banking Edition prototype** (entity types + 2 PowerMaps verticales: "AML Hot Jurisdictions" + "OFAC Sanctions") | Demo-able a 1er piloto banco |
| 9-12 | Export PDF/PowerPoint + email alerts + pricing page | Sales-ready |

**Métrica de éxito a 90 días**: 1 LOI firmado con piloto banking + 2
verticales más en discovery + arquitectura production-ready para escalar a
100 concurrent users.

---

## 9. Activo intangible más valioso

Lo que no se ve en el código pero define la velocidad real del equipo:

- **Memoria persistente del proyecto** — un nuevo dev (humano o IA) levanta
  velocidad en <1 semana. Memory entries como `feedback_rule_7_rotation_invariant`
  evitan que regresiones se repitan.
- **6 architectural rules cementadas** — deuda técnica capped.
- **Vibe + design system** — el look "glass + cyan + gold accents" es
  distintivo y muy poco común en B2B intelligence (donde dominan tablas
  grises). Vendible como diferenciador visual.
- **Capacidad de iterar rápido** — el 2026-05-12 shippeamos 2 features
  grandes en una sesión nocturna. La fricción dev↔product es mínima.
- **AI-native mantenimiento** — el repo está estructurado para que sesiones
  futuras de Claude (o cualquier LLM) tomen contexto rápido sin re-explicar.
  Esto es un activo compuesto: cada sesión persiste sus aprendizajes.

---

## Changelog del documento

- **2026-05-12 (v1.0)** — Edición inicial post-sesión "sleepy-headquarters-blueprint".
  Captura del estado del producto + arquitectura + 7 verticales adyacentes
  + plan 90 días.
