#!/bin/bash
# Phase 3.3 — mount EngineSlot in AppShell, remove StrictMode
# Run from repo root: bash phase3_3_create_files.sh

set -e

echo "Check — EngineSlot exists..."
if [ ! -f src/components/EngineSlot/EngineSlot.tsx ]; then
  echo "STOP: EngineSlot.tsx missing"
  exit 1
fi
echo "  ✅ EngineSlot.tsx found"

echo "Check — engineManagerMachine in app.machine..."
if ! grep -q "engineManagerRef" src/app/app.machine.ts; then
  echo "STOP: Phase 3.2 not complete — engineManagerRef not in app.machine"
  exit 1
fi
echo "  ✅ engineManagerRef found in app.machine"

echo ""
echo "Applying changes..."
echo ""

# ─── File 1: src/main.tsx — remove StrictMode ────────────────────────────────
# DeckGL imperative causes double-mount assertion failures under StrictMode.
# Removing per ipm-maps SKILL.md — documented pattern.

echo "Updating src/main.tsx — removing StrictMode..."
cat > src/main.tsx << 'EOF'
// StrictMode removed — DeckGL imperative init fails under double-mount (React StrictMode).
// See: ipm-maps skill, "Common Errors" section.
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/routes/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
EOF

# ─── File 2: src/app/AppShell.tsx — mount EngineSlot ─────────────────────────

echo "Updating src/app/AppShell.tsx — mounting EngineSlot..."
cat > src/app/AppShell.tsx << 'EOF'
// src/app/AppShell.tsx
// Root layout. Mounts EngineSlot and syncs URL → app.machine.
// EngineManager is spawned in app.machine context — AppShell reads the ref
// and passes it to EngineSlot. ENGINE.REQUEST dispatched on mount when
// slot refs are ready.

import { useEffect, useRef, useCallback } from 'react'
import { useSearch }  from '@tanstack/react-router'
import { AppActor }   from './app.machine'
import { EngineSlot } from '@/components/EngineSlot/EngineSlot'
import type { EngineSlotRefs } from '@/components/EngineSlot/EngineSlot'

// ---------------------------------------------------------------------------
// RouterSync — keeps URL ↔ machine in sync (Phase 2a pattern, unchanged)
// ---------------------------------------------------------------------------

function RouterSync() {
  const search = useSearch({ from: '/workstation' })
  const actor  = AppActor.useActorRef()
  useEffect(() => {
    actor.send({ type: 'URL_CHANGED', search })
  }, [search, actor])
  return null
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export function AppShell() {
  const actor          = AppActor.useActorRef()
  const engineRef      = AppActor.useSelector(s => s.context.engineManagerRef)
  const requestSentRef = useRef(false)

  // Called by EngineSlot once both divs are mounted and refs are ready.
  // Dispatches ENGINE.REQUEST to engineManager with slotB as the container.
  // slotB = current engine slot (slot-a is previous, used during crossfade).
  const handleRefsReady = useCallback((refs: EngineSlotRefs) => {
    if (requestSentRef.current) return
    requestSentRef.current = true
    engineRef.send({
      type:     'ENGINE.REQUEST',
      engineId: 'globe',
      input: {
        container: refs.slotB,
        view:      actor.getSnapshot().context.atlasView,
      },
    })
  }, [engineRef, actor])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090b10', position: 'relative' }}>
      <RouterSync />

      <EngineSlot
        actorRef={engineRef}
        onRefsReady={handleRefsReady}
      />

      {/* Phase 4: <AppHeader /> */}
      {/* Phase 5-6: overlay condicional */}
    </div>
  )
}
EOF

echo ""
echo "✅ Phase 3.3 files updated:"
echo "   src/main.tsx      (StrictMode removed)"
echo "   src/app/AppShell.tsx  (EngineSlot mounted, ENGINE.REQUEST on refs ready)"
echo ""
echo "Next: npx tsc --noEmit"
echo "If 0 errors: npm run dev — globe should be visible at /workstation"
