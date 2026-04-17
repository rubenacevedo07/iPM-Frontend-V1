// src/components/OverlayPanel/OverlayPanel.tsx
//
// Phase 4.0 stub overlay panel. Reads search params from TanStack Router and
// renders a minimal visual when overlay=company|person is present in the URL.
// Full entity data fetching, styling, and overlay system come in later phases.

import { useSearch, useNavigate } from '@tanstack/react-router';
import styles from './OverlayPanel.module.scss';

export function OverlayPanel() {
  const search = useSearch({ from: '/workstation' });
  const navigate = useNavigate();

  const overlay = search.overlay as string | undefined;
  const id = search.id as string | number | undefined;

  if (!overlay) return null;

  const handleClose = () => {
    navigate({
      to: '/workstation',
      search: { overlay: undefined, id: undefined } as any,
    });
  };

  return (
    <div className={styles.overlayPanelRoot} role="dialog" aria-modal="true">
      <button
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close overlay"
        type="button"
      >
        ×
      </button>
      <div className={styles.overlayContent}>
        <div className={styles.overlayType}>{overlay.toUpperCase()}</div>
        <div className={styles.overlayId}>ID: {id ?? 'unknown'}</div>
        <div className={styles.overlayHint}>
          Phase 4.0 stub. Real entity data in Phase 4.3+.
        </div>
      </div>
    </div>
  );
}
