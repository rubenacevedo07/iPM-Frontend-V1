import { useCompanyCommodities, dependencyColor } from '@/hooks/useCompanyData';
import { glass, labelCss, FONT_SANS, FONT_MONO } from './shared';

interface Props { companyId: number | null }

export function CompanyCommoditiesCard({ companyId }: Props) {
  const { data: commodities, loading } = useCompanyCommodities(companyId ?? 0);
  const items = companyId ? (commodities ?? []) : [];

  if (loading) return <LoadingCard label="COMMODITY DEPENDENCIES" />;
  if (!items.length) return null;

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>COMMODITY DEPENDENCIES</div>
      {items.slice(0, 6).map((c, i) => {
        const dep = dependencyColor(c.dependencyLevel);
        return (
          <div key={`${c.commodityId}-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>
                {c.commodityName}
              </div>
              {c.contractType && (
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  {c.contractType}
                </div>
              )}
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 8, fontWeight: 600,
              color: dep.text, background: dep.bg,
              borderRadius: 3, padding: '2px 6px',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {c.dependencyLevel}
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: '#00e5ff', width: 36, textAlign: 'right' }}>
              {c.exposurePercentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
}
