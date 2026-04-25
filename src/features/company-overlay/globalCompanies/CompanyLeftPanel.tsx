import type { Company } from '@/types/company';
import {
  useCompanyRiskProfile,
  useCompanyOwnership,
  useCompanyFabrics,
  dependencyColor, riskColor,
} from '@/hooks/useCompanyData';
import { labelCss, FONT_SANS, FONT_MONO, C_HQ, fmtCap, countryToFlag } from './shared';

type LeftTab = 'KEY DATA' | 'RISK' | 'OWNERSHIP' | 'FACTORIES';
const LEFT_TABS: LeftTab[] = ['KEY DATA', 'RISK', 'OWNERSHIP', 'FACTORIES'];

interface Props {
  company:     Company;
  activeTab:   LeftTab;
  onTabChange: (t: LeftTab) => void;
}

export function CompanyLeftPanel({ company, activeTab, onTabChange }: Props) {
  return (
    <div style={{
      background: 'rgba(10,12,18,0.98)',
      borderRight: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, overflowX: 'auto' }}>
        {LEFT_TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <div key={tab} onClick={() => onTabChange(tab)} style={{
              padding: '8px 9px', fontFamily: FONT_MONO, fontSize: 7, letterSpacing: '0.4px',
              color: active ? '#a855f7' : '#4a5568',
              borderBottom: active ? '2px solid #a855f7' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#8a9bb5'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#4a5568'; }}
            >{tab}</div>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {activeTab === 'KEY DATA'  && <KeyDataTab   company={company} />}
        {activeTab === 'RISK'      && <RiskTab       company={company} />}
        {activeTab === 'OWNERSHIP' && <OwnershipTab  company={company} />}
        {activeTab === 'FACTORIES' && <FactoriesTab  company={company} />}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(168,85,247,0.04)', flexShrink: 0 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#a855f7', letterSpacing: '1px', marginBottom: 4 }}>✦ ATLAS</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 9, color: '#8a9bb5', lineHeight: 1.5 }}>
          {company.description
            ? company.description.slice(0, 160) + (company.description.length > 160 ? '…' : '')
            : `${company.name} intelligence snapshot. Select a tab to explore power scores, risk dimensions, and ownership structure.`}
        </div>
      </div>
    </div>
  );
}

function KeyDataTab({ company }: { company: Company }) {
  return (
    <>
      <Section title="Company Overview">
        {([
          { k: 'Market Cap',   v: fmtCap(company.marketCapUsd),  color: '#a855f7' },
          { k: 'Revenue',      v: fmtCap(company.revenueUsd),    color: '#a855f7' },
          { k: 'Net Income',   v: fmtCap(company.netIncomeUsd),  color: null },
          { k: 'Employees',    v: company.employees?.toLocaleString() ?? '—', color: null },
          { k: 'Founded',      v: company.founded ? String(company.founded) : null, color: null },
          { k: 'HQ',           v: company.headquarters ? `${countryToFlag(company.country)} ${company.headquarters}` : null, color: null },
          { k: 'Sector',       v: company.category?.toUpperCase() ?? null, color: null },
          { k: 'CEO',          v: company.ceo ?? null, color: null },
        ] as { k: string; v: string | null | undefined; color: string | null }[])
          .filter(r => r.v)
          .map(row => <KVRow key={row.k} k={row.k} v={row.v!} color={row.color} />)}
      </Section>

      {company.isChokepoint && (
        <Section title="⚠ CHOKEPOINT">
          <div style={{ padding: '10px 12px', background: 'rgba(229,57,53,0.06)', border: '1px solid rgba(229,57,53,0.25)', borderRadius: 6 }}>
            <KVRow k="IsChokepoint" v="TRUE" color="#e53935" />
            {company.softDependencyScore != null && <KVRow k="SoftDependencyScore" v={`${company.softDependencyScore}/100`} color="#e53935" />}
            {company.substitutionLatencyMonths != null && <KVRow k="SubstitutionLatency" v={`${company.substitutionLatencyMonths} months`} color="#e53935" />}
            {company.systemicImportanceLevel && <KVRow k="SystemicImportance" v={company.systemicImportanceLevel} color="#e53935" />}
          </div>
        </Section>
      )}
    </>
  );
}

function RiskTab({ company }: { company: Company }) {
  const { data: profile, loading } = useCompanyRiskProfile(company.id);
  if (loading) return <LoadingRow />;
  if (!profile) return <EmptyRow label="No risk data available" />;
  const tierCol = riskColor(profile.riskTier);
  return (
    <>
      <Section title="Risk Summary">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700, color: tierCol, background: `${tierCol}15`, border: `1px solid ${tierCol}40`, borderRadius: 3, padding: '2px 6px', letterSpacing: '0.06em' }}>
            {profile.riskTier} · {profile.overallRiskScore}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          {[
            { label: 'CRITICAL',   value: profile.criticalDependencies, color: '#e53935' },
            { label: 'HIGH',       value: profile.highDependencies,     color: '#f59e0b' },
            { label: 'CONC. RISK', value: `${profile.concentrationRisk}%`, color: C_HQ },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{m.label}</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </Section>
      {profile.commodityBreakdown && profile.commodityBreakdown.length > 0 && (
        <Section title="Commodity Exposure">
          {profile.commodityBreakdown.slice(0, 5).map((c: any, i: number) => {
            const dep = dependencyColor(c.dependencyLevel);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ flex: 1, fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{c.commodityName}</div>
                <span style={{ fontFamily: FONT_MONO, fontSize: 7, color: dep.text, background: dep.bg, borderRadius: 2, padding: '1px 4px' }}>{c.dependencyLevel}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: C_HQ, width: 28, textAlign: 'right' }}>{c.exposurePercentage}%</span>
              </div>
            );
          })}
        </Section>
      )}
    </>
  );
}

function OwnershipTab({ company }: { company: Company }) {
  const { data: rawHolders, loading } = useCompanyOwnership(company.id);
  const holders = (rawHolders as any[]) ?? [];
  if (loading) return <LoadingRow />;
  if (!holders.length) return <EmptyRow label="No ownership data" />;
  return (
    <Section title="Institutional Holders">
      {holders.slice(0, 8).map((h: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: 'rgba(59,139,212,0.12)', border: '1px solid rgba(59,139,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 7, fontWeight: 700, color: '#3b8bd4' }}>{h.assetManager?.name?.slice(0, 2).toUpperCase() ?? 'AM'}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {h.assetManager?.name ?? '—'}
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: C_HQ, flexShrink: 0 }}>{h.ownershipPercentage?.toFixed(1)}%</span>
        </div>
      ))}
    </Section>
  );
}

function FactoriesTab({ company }: { company: Company }) {
  const { data: fabrics, loading } = useCompanyFabrics(company.id);
  const items = (fabrics as any[]) ?? [];
  if (loading) return <LoadingRow />;
  if (!items.length) return <EmptyRow label="No facility data" />;
  return (
    <Section title="Facilities">
      {items.map((f: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF8C00', flexShrink: 0, marginTop: 3 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.82)' }}>{countryToFlag(f.country)} {f.city}{f.country ? `, ${f.country}` : ''}</div>
            {f.facilityType && <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568', marginTop: 1 }}>{f.facilityType}</div>}
            {f.employees != null && <div style={{ fontFamily: FONT_SANS, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{f.employees.toLocaleString()} employees</div>}
          </div>
        </div>
      ))}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...labelCss }}>{title}</div>
      {children}
    </div>
  );
}

function KVRow({ k, v, color }: { k: string; v: string; color?: string | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{k}</span>
      <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 600, color: color ?? '#e8edf5' }}>{v}</span>
    </div>
  );
}

function LoadingRow() { return <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>; }
function EmptyRow({ label }: { label: string }) { return <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{label}</div>; }
