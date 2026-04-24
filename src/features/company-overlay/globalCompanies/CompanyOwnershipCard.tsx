import { useCompanyOwnership, useCompanyOci } from '@/hooks/useCompanyData';
import type { AssetManagerCompanyFull, CompanyOci } from '@/types/assetManagerCompany';
import { glass, labelCss, FONT_SANS, FONT_MONO, C_HQ } from './shared';

interface Props { companyId: number | null }

export function CompanyOwnershipCard({ companyId }: Props) {
  const { data: rawHolders, loading } = useCompanyOwnership(companyId ?? 0);
  const { data: rawOci } = useCompanyOci(companyId ?? 0);
  const holders = rawHolders as unknown as AssetManagerCompanyFull[] | null
  const oci = rawOci as unknown as CompanyOci | null
  const items = companyId ? (holders ?? []) : [];

  if (loading) return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>INSTITUTIONAL OWNERSHIP</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
  if (!items.length && !oci) return null;

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...labelCss, marginBottom: 0 }}>INSTITUTIONAL OWNERSHIP</div>
        {oci && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>OCI</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: ociColor(oci.oci) }}>{oci.oci}</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        {items.slice(0, 5).map((h, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4, flexShrink: 0,
              background: 'rgba(59,139,212,0.12)', border: '1px solid rgba(59,139,212,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {h.assetManager.logo ? (
                <img src={`/logos/${h.assetManager.logo}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span style={{ fontFamily: FONT_MONO, fontSize: 7, fontWeight: 700, color: '#3b8bd4' }}>
                  {h.assetManager.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.82)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {h.assetManager.name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {h.isMajorHolder && (
                <span style={{
                  fontFamily: FONT_MONO, fontSize: 7, fontWeight: 700,
                  color: '#FFAA00', background: 'rgba(255,170,0,0.12)',
                  border: '1px solid rgba(255,170,0,0.3)',
                  borderRadius: 2, padding: '0 4px',
                }}>
                  MAJOR
                </span>
              )}
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: C_HQ }}>
                {h.ownershipPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ociColor(score: number): string {
  if (score >= 75) return '#e53935';
  if (score >= 50) return '#f59e0b';
  return '#00e5ff';
}
