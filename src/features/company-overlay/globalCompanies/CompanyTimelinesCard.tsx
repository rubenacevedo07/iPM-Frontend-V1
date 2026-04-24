import { useCompanyTimelines, riskColor } from '@/hooks/useCompanyData';
import { glass, labelCss, FONT_SANS, FONT_MONO } from './shared';

const DIV_COLORS: Record<string, string> = {
  RegulatoryDecision: '#f59e0b',
  ElectionOutcome: '#8B5CF6',
  EarningsSurprise: '#00e676',
  CentralBankDecision: '#00e5ff',
  MilitaryEvent: '#e53935',
  GeopoliticalCrisis: '#e53935',
  SupplyShock: '#ff8c00',
  EconomicIndicator: '#3b8bd4',
};

interface Props { companyNodeId: string | null }

export function CompanyTimelinesCard({ companyNodeId }: Props) {
  const { data: timelines, loading } = useCompanyTimelines(companyNodeId ?? '');
  const items = companyNodeId ? (timelines ?? []) : [];

  if (loading) return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>PREDICTION TIMELINES</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
  if (!items.length) return null;

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>PREDICTION TIMELINES</div>
      {items.slice(0, 4).map((tl, i) => {
        const divColor = DIV_COLORS[tl.divergenceType] ?? '#3b8bd4';
        const pct = Math.round(tl.probA * 100);
        return (
          <div key={tl.id} style={{
            padding: '6px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 7, fontWeight: 600,
                color: divColor, background: `${divColor}15`,
                border: `1px solid ${divColor}40`,
                borderRadius: 2, padding: '1px 5px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {tl.divergenceType.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              {tl.edgeRiskScore != null && (
                <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: riskColor(tl.edgeRiskScore) }}>
                  RISK {tl.edgeRiskScore}
                </span>
              )}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.82)', marginBottom: 4, lineHeight: 1.3 }}>
              {tl.question}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: divColor }} />
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: divColor, width: 32, textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
