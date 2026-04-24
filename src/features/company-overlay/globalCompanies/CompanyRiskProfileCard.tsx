import { useCompanyRiskProfile, dependencyColor, riskColor } from '@/hooks/useCompanyData';
import { glass, labelCss, FONT_SANS, FONT_MONO } from './shared';

interface Props { companyId: number | null }

export function CompanyRiskProfileCard({ companyId }: Props) {
  const { data: profile, loading } = useCompanyRiskProfile(companyId ?? 0);

  if (loading) return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>COMMODITY RISK PROFILE</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
  if (!profile || !companyId) return null;

  const tierCol = riskColor(profile.riskTier);

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ ...labelCss, marginBottom: 0 }}>COMMODITY RISK PROFILE</div>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700,
          color: tierCol, background: `${tierCol}15`,
          border: `1px solid ${tierCol}40`,
          borderRadius: 3, padding: '2px 6px',
          letterSpacing: '0.06em',
        }}>
          {profile.riskTier} · {profile.overallRiskScore}
        </span>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {[
          { label: 'CRITICAL', value: profile.criticalDependencies, color: '#e53935' },
          { label: 'HIGH', value: profile.highDependencies, color: '#f59e0b' },
          { label: 'CONC. RISK', value: `${profile.concentrationRisk}%`, color: '#00e5ff' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{m.label}</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Commodity breakdown */}
      {profile.commodityBreakdown?.slice(0, 4).map((c, i) => {
        const dep = dependencyColor(c.dependencyLevel);
        return (
          <div key={c.commodityId} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{c.commodityName}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{c.category}</div>
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 7, color: dep.text, background: dep.bg,
              borderRadius: 2, padding: '1px 4px',
            }}>
              {c.dependencyLevel}
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: '#00e5ff', width: 28, textAlign: 'right' }}>
              {c.exposurePercentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
