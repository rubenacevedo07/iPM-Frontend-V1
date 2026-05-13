// src/components/EngineSlot/EngineSlot.tsx
//
// Pure view over EngineManager actor state.
// Opacity is written directly to the DOM — no React re-renders on state change.
//
// Slot mapping (fixed):
//   slot-a → previousBridge container (fades out during crossfade)
//   slot-b → currentBridge container  (fades in during crossfade)
//
// Parent responsibilities:
//   - Dispatch ENGINE.REQUEST with slotB ref as EngineInitInput.container
//   - Dispatch ENGINE.SWAP with slotA ref as previous, slotB as incoming
//   - EngineSlot does NOT dispatch any events — it is read-only over actor state

import { useEffect, useRef }         from 'react';
import type { ActorRefFrom }         from 'xstate';
import type { engineManagerMachine } from '@/engine/engineManager.machine';
import styles                        from './EngineSlot.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineSlotRefs {
  slotA: HTMLDivElement;
  slotB: HTMLDivElement;
}

interface Props {
  actorRef:    ActorRefFrom<typeof engineManagerMachine>;
  onRefsReady: (refs: EngineSlotRefs) => void;
}

interface SlotOpacity { a: number; b: number }

// ---------------------------------------------------------------------------
// Opacity derivation — snapshot.matches() only, no string matching
// ---------------------------------------------------------------------------

function deriveOpacity(
  snapshot: ReturnType<ActorRefFrom<typeof engineManagerMachine>['getSnapshot']>
): SlotOpacity {
  // activeSlot = the slot currently holding the visible (outgoing) engine.
  // The incoming engine always occupies the OTHER slot.
  const active = snapshot.context.activeSlot ?? 'b';
  const activeIsB = active === 'b';

  if (snapshot.matches({ active: { crossfading: 'waiting' } })) {
    // Outgoing (active) slot stays visible while incoming slot loads.
    return activeIsB ? { a: 0, b: 1 } : { a: 1, b: 0 };
  }
  if (snapshot.matches({ active: { crossfading: 'settling' } })) {
    // Incoming slot fades in, outgoing slot fades out.
    return activeIsB ? { a: 1, b: 0 } : { a: 0, b: 1 };
  }
  if (snapshot.matches({ active: 'idle' })) {
    // After clearPrevious fires, activeSlot has already toggled to the new slot.
    return activeIsB ? { a: 0, b: 1 } : { a: 1, b: 0 };
  }
  return { a: 0, b: 0 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EngineSlot({ actorRef, onRefsReady }: Props) {
  const slotARef     = useRef<HTMLDivElement>(null);
  const slotBRef     = useRef<HTMLDivElement>(null);
  const refsNotified = useRef(false);

  // Notify parent once both refs are mounted
  useEffect(() => {
    if (slotARef.current && slotBRef.current && !refsNotified.current) {
      refsNotified.current = true;
      onRefsReady({ slotA: slotARef.current, slotB: slotBRef.current });
    }
  }, [onRefsReady]);

  // Subscribe to actor — write opacity directly to DOM, no re-render
  useEffect(() => {
    function applyOpacity(
      snapshot: ReturnType<ActorRefFrom<typeof engineManagerMachine>['getSnapshot']>
    ): void {
      if (!slotARef.current || !slotBRef.current) return;
      const { a, b } = deriveOpacity(snapshot);
      slotARef.current.style.opacity = String(a);
      slotBRef.current.style.opacity = String(b);
      slotARef.current.toggleAttribute('aria-hidden', a === 0);
      slotBRef.current.toggleAttribute('aria-hidden', b === 0);
    }

    applyOpacity(actorRef.getSnapshot());
    const sub = actorRef.subscribe(applyOpacity);
    return () => sub.unsubscribe();
  }, [actorRef]);

  return (
    <div className={styles.engineSlotRoot}>
      <div ref={slotARef} id="engine-a" className={styles.engineSlot} />
      <div ref={slotBRef} id="engine-b" className={styles.engineSlot} />
    </div>
  );
}
