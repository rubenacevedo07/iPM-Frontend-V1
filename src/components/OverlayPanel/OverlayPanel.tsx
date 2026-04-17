// src/components/OverlayPanel/OverlayPanel.tsx
//
// Phase 4.3b — added 4 expandable sections below core data:
// Products, Facilities, Markets, Shareholders.
// Each fetches lazily (only when user expands its section).

import { useSearch, useNavigate } from '@tanstack/react-router';
import {
  useCompanyById,
  useCompanyProducts,
  useCompanyFabrics,
  useCompanyMarkets,
  useCompanyOwnership,
  formatMarketCap,
  formatEmployees,
} from '@/hooks/useCompanyData';
import { useState } from 'react';
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
// Company overlay — core + expandable sections
// ---------------------------------------------------------------------------

interface CompanyOverlayProps { companyId: number }

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
      {/* Header */}
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

      {/* Badges */}
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

      {/* Core field list */}
      <dl className={styles.fieldList}>
        {company.ceo && (<><dt>CEO</dt><dd>{company.ceo}</dd></>)}
        {company.country && (<><dt>Country</dt><dd>{company.country}</dd></>)}
        {company.headquarters && (<><dt>Headquarters</dt><dd>{company.headquarters}</dd></>)}
        {company.category && (<><dt>Category</dt><dd>{company.category}</dd></>)}
        <dt>Market Cap</dt><dd>{formatMarketCap(company.marketCapUsd)}</dd>
        <dt>Employees</dt><dd>{formatEmployees(company.employees)}</dd>
      </dl>

      {/* Expandable sections */}
      <div className={styles.sections}>
        <ProductsSection companyId={companyId} />
        <FacilitiesSection companyId={companyId} />
        <MarketsSection companyId={companyId} />
        <ShareholdersSection companyId={companyId} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable section infrastructure
// ---------------------------------------------------------------------------

interface SectionProps { companyId: number }

function SectionHeader({ title, count, open }: { title: string; count: number | null; open: boolean }) {
  return (
    <summary className={styles.sectionHeader}>
      <span className={styles.sectionCaret}>{open ? '▾' : '▸'}</span>
      <span className={styles.sectionTitle}>{title}</span>
      {count !== null && <span className={styles.sectionCount}>{count}</span>}
    </summary>
  );
}

function SectionLoading() {
  return (
    <div className={styles.sectionLoading}>
      <div className={styles.spinnerSmall} />
      <span>Loading…</span>
    </div>
  );
}

function SectionEmpty({ label }: { label: string }) {
  return <div className={styles.sectionEmpty}>No {label}.</div>;
}

// ---------------------------------------------------------------------------
// Products section
// CompanyProduct shape (matches backend /api/CompanyProducts/company/{id}):
//   { id, companyId, productName, sku, productDescription }
// ---------------------------------------------------------------------------

function ProductsSection({ companyId }: SectionProps) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useCompanyProducts(open ? companyId : 0);
  const items = data ?? [];

  return (
    <details
      className={styles.section}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <SectionHeader title="Products" count={open && !loading ? items.length : null} open={open} />
      {open && (loading ? <SectionLoading /> :
        error ? <div className={styles.sectionError}>Failed to load</div> :
        items.length === 0 ? <SectionEmpty label="products" /> :
        <ul className={styles.itemList}>
          {items.map((p, i) => (
            <li key={`${p.id}-${i}`} className={styles.item}>
              <div className={styles.itemTitle}>{p.productName}</div>
              {p.sku && <div className={styles.itemSub}>{p.sku}</div>}
              {p.productDescription && <div className={styles.itemDesc}>{p.productDescription}</div>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Facilities section
// ---------------------------------------------------------------------------

function FacilitiesSection({ companyId }: SectionProps) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useCompanyFabrics(open ? companyId : 0);
  const items = data ?? [];

  return (
    <details
      className={styles.section}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <SectionHeader title="Facilities" count={open && !loading ? items.length : null} open={open} />
      {open && (loading ? <SectionLoading /> :
        error ? <div className={styles.sectionError}>Failed to load</div> :
        items.length === 0 ? <SectionEmpty label="facilities" /> :
        <ul className={styles.itemList}>
          {items.map((f, i) => (
            <li key={`${f.name}-${i}`} className={styles.item}>
              <div className={styles.itemTitle}>{f.name}</div>
              <div className={styles.itemSub}>
                {[f.city, f.country].filter(Boolean).join(', ')}
                {typeof f.employees === 'number' && f.employees > 0 ? ` · ${formatEmployees(f.employees)}` : ''}
              </div>
              {f.description && <div className={styles.itemDesc}>{f.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Markets section
// ---------------------------------------------------------------------------

function MarketsSection({ companyId }: SectionProps) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useCompanyMarkets(open ? companyId : 0);
  const items = data ?? [];

  return (
    <details
      className={styles.section}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <SectionHeader title="Markets" count={open && !loading ? items.length : null} open={open} />
      {open && (loading ? <SectionLoading /> :
        error ? <div className={styles.sectionError}>Failed to load</div> :
        items.length === 0 ? <SectionEmpty label="markets" /> :
        <ul className={styles.itemList}>
          {items.map((m, i) => (
            <li key={`${m.countryContinent}-${i}`} className={styles.item}>
              <div className={styles.itemTitle}>{m.countryContinent}</div>
              {m.description && <div className={styles.itemDesc}>{m.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------
// Shareholders section
// ---------------------------------------------------------------------------

function ShareholdersSection({ companyId }: SectionProps) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useCompanyOwnership(open ? companyId : 0);
  const items = data ?? [];

  // Sort by ownershipPercentage desc, show only first 10 to keep panel compact
  const sorted = [...items].sort(
    (a, b) => (b?.ownershipPercentage ?? 0) - (a?.ownershipPercentage ?? 0),
  );
  const displayed = sorted.slice(0, 10);
  const extraCount = sorted.length - displayed.length;

  return (
    <details
      className={styles.section}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <SectionHeader title="Shareholders" count={open && !loading ? items.length : null} open={open} />
      {open && (loading ? <SectionLoading /> :
        error ? <div className={styles.sectionError}>Failed to load</div> :
        items.length === 0 ? <SectionEmpty label="shareholders" /> :
        <>
          <ul className={styles.itemList}>
            {displayed.map((s, i) => {
              const name = s?.assetManager?.name ?? 'Unknown';
              const pct = s?.ownershipPercentage;
              const isMajor = s?.isMajorHolder === true;
              return (
                <li key={`${name}-${i}`} className={styles.item}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{name}</span>
                    {isMajor && <span className={styles.badgeMajor}>Major</span>}
                  </div>
                  {typeof pct === 'number' && (
                    <div className={styles.itemSub}>{pct.toFixed(2)}%</div>
                  )}
                </li>
              );
            })}
          </ul>
          {extraCount > 0 && (
            <div className={styles.itemFooter}>+ {extraCount} more</div>
          )}
        </>
      )}
    </details>
  );
}
