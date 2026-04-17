// src/components/OverlayPanel/OverlayPanel.tsx
//
// Phase 4.3a — overlay panel showing core company data fetched from backend.
// Reads overlay type + id from URL, dispatches useCompanyById, renders fields.
// Phase 4.3b+ will add sections: products, facilities, markets, clients, etc.

import { useSearch, useNavigate } from '@tanstack/react-router';
import { useCompanyById, formatMarketCap, formatEmployees } from '@/hooks/useCompanyData';
import styles from './OverlayPanel.module.scss';

export function OverlayPanel() {
  const search = useSearch({ from: '/workstation' });
  const navigate = useNavigate();

  const overlay = search.overlay as string | undefined;
  const id = search.id as number | undefined;

  if (!overlay || !id) return null;

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
      {overlay === 'company' ? (
        <CompanyOverlay companyId={Number(id)} />
      ) : (
        <div className={styles.overlayPlaceholder}>
          <div className={styles.overlayType}>{overlay.toUpperCase()}</div>
          <div className={styles.overlayHint}>Not yet implemented.</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company overlay section — extracted for readability
// ---------------------------------------------------------------------------

interface CompanyOverlayProps {
  companyId: number;
}

function CompanyOverlay({ companyId }: CompanyOverlayProps) {
  const { data: company, loading, error } = useCompanyById(companyId);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <div className={styles.loadingLabel}>Loading…</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorLabel}>Failed to load company</div>
        <div className={styles.errorHint}>ID {companyId}</div>
      </div>
    );
  }

  const importanceClass =
    company.systemicImportanceLevel === 'Critical' ? styles.badgeCritical :
    company.systemicImportanceLevel === 'High'     ? styles.badgeHigh :
    company.systemicImportanceLevel === 'Medium'   ? styles.badgeMedium :
                                                     styles.badgeDefault;

  return (
    <div className={styles.companyContent}>
      <div className={styles.companyHeader}>
        <div className={styles.overlayType}>COMPANY</div>
        <h2 className={styles.companyName}>{company.name}</h2>
        {company.ticker && (
          <div className={styles.companyTicker}>
            {company.ticker}
            {company.market ? ` · ${company.market}` : ''}
          </div>
        )}
      </div>

      <div className={styles.badgeRow}>
        {company.systemicImportanceLevel && (
          <span className={`${styles.badge} ${importanceClass}`}>
            {company.systemicImportanceLevel}
          </span>
        )}
        {company.isChokepoint && (
          <span className={`${styles.badge} ${styles.badgeChokepoint}`}>
            CHOKEPOINT
          </span>
        )}
      </div>

      <dl className={styles.fieldList}>
        {company.ceo && (
          <>
            <dt>CEO</dt>
            <dd>{company.ceo}</dd>
          </>
        )}
        {company.country && (
          <>
            <dt>Country</dt>
            <dd>{company.country}</dd>
          </>
        )}
        {company.headquarters && (
          <>
            <dt>Headquarters</dt>
            <dd>{company.headquarters}</dd>
          </>
        )}
        {company.category && (
          <>
            <dt>Category</dt>
            <dd>{company.category}</dd>
          </>
        )}
        <dt>Market Cap</dt>
        <dd>{formatMarketCap(company.marketCapUsd)}</dd>
        <dt>Employees</dt>
        <dd>{formatEmployees(company.employees)}</dd>
      </dl>
    </div>
  );
}
