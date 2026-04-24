import { useCompanyEdgeRisk, riskColor } from '@/hooks/useCompanyData';
import { glass, labelCss, FONT_SANS, FONT_MONO } from './shared';

interface Props { companyNodeId: string | null }

const TREND_ICON: Record<string, { icon: string; color: string }> = {
  up:   { icon: '▲', color: '#e53935' },
  down: { icon: '▼', color: '#00e676' },
  flat: { icon: '—', color: '#4a5568' },
};

export function CompanyEdgeRiskCard({ companyNodeId }: Props) {
  const { data: risks, loading } = useCompanyEdgeRisk(companyNodeId ?? '');
  const items = companyNodeId ? (risks ?? []) : [];

  if (loading) return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>EDGE RISK SCORES</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
  if (!items.length) return null;

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>EDGE RISK SCORES</div>
      {items.slice(0, 5).map((r, i) => {
        const scoreCol = riskColor(r.score);
        const trend = TREND_ICON[r.trend] ?? TREND_ICON.flat;
        return (
          <div key={r.edgeId} style={{
            padding: '5px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.sourceLabel} → {r.targetLabel}
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  {r.edgeType} · {r.edgeLabel}
                </div>
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: trend.color }}>{trend.icon}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: scoreCol }}>
                {r.score}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div style={{ height: 3, borderRadius: 2, width: `${Math.min(r.score, 100)}%`, background: scoreCol }} />
            </div>
            {r.linkedTimelines > 0 && (
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#8B5CF6', marginTop: 3 }}>
                {r.linkedTimelines} linked timeline{r.linkedTimelines > 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
