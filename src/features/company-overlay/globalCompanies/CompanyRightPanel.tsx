import type { Company } from '@/types/company';
import {
  useCompanyTimelines, useCompanyEdgeRisk, useCompanyCommodities,
  useCompanyPersons,
  riskColor, dependencyColor,
} from '@/hooks/useCompanyData';
import { labelCss, FONT_SANS, FONT_MONO, fmtCap } from './shared';

type PCCTab = 'PERSONS' | 'CLIENTS' | 'COMMODITIES';
const PCC_TABS: PCCTab[] = ['PERSONS', 'CLIENTS', 'COMMODITIES'];

interface Props {
  company:       Company;
  companyNodeId: string;
  activeTab:     PCCTab;
  onTabChange:   (t: PCCTab) => void;
}

export function CompanyRightPanel({ company, companyNodeId, activeTab, onTabChange }: Props) {
  return (
    <div style={{ background: 'rgba(10,12,18,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden', direction: 'rtl' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', direction: 'ltr', flexShrink: 0 }}>
        {PCC_TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <div key={tab} onClick={() => onTabChange(tab)} style={{
              flex: 1, padding: '7px 4px', textAlign: 'center', fontFamily: FONT_MONO, fontSize: 7,
              color: active ? 'rgb(1, 203, 106)' : '#4a5568', borderBottom: active ? '2px solid rgb(1, 203, 106)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#8a9bb5'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#4a5568'; }}
            >{tab}</div>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', direction: 'ltr' }}>
        <TimelinesSection companyNodeId={companyNodeId} />
        {activeTab === 'PERSONS'     && <PersonsSection     company={company} />}
        {activeTab === 'CLIENTS'     && <ClientsSection     companyNodeId={companyNodeId} />}
        {activeTab === 'COMMODITIES' && <CommoditiesSection companyId={company.id} />}
        <SectorSection company={company} />
      </div>

      <StockStrip company={company} />
    </div>
  );
}

function TimelinesSection({ companyNodeId }: { companyNodeId: string }) {
  const { data: timelines, loading } = useCompanyTimelines(companyNodeId);
  const items = (timelines ?? []) as any[];
  const DIV_COLORS: Record<string, string> = {
    RegulatoryDecision: '#f59e0b', ElectionOutcome: '#8B5CF6', EarningsSurprise: '#00e676',
    CentralBankDecision: '#00e5ff', MilitaryEvent: '#e53935', GeopoliticalCrisis: '#e53935',
    SupplyShock: '#ff8c00', EconomicIndicator: '#3b8bd4',
  };
  return (
    <RSection title={`Open Timelines (${items.length})`}>
      {loading && <LoadText />}
      {!loading && !items.length && <EmptyText label="No timelines" />}
      {items.slice(0, 4).map((tl: any, i: number) => {
        const divColor = DIV_COLORS[tl.divergenceType] ?? '#3b8bd4';
        const pct = Math.round((tl.probA ?? 0.5) * 100);
        return (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: divColor, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#8a9bb5', flex: 1 }}>{tl.question}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 6px', borderRadius: 2, background: `${divColor}12`, color: divColor, border: `1px solid ${divColor}30` }}>A: {pct}%</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 6px', borderRadius: 2, background: 'rgba(0,212,170,0.08)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.25)' }}>B: {100 - pct}%</span>
            </div>
          </div>
        );
      })}
    </RSection>
  );
}

function PersonsSection({ company }: { company: Company }) {
  const { data: persons, loading } = useCompanyPersons(company.id);
  const items = persons ?? [];
  return (
    <RSection title="Key Persons">
      {loading && <LoadText />}
      {!loading && !items.length && <EmptyText label="No person data" />}
      {items.slice(0, 6).map((p, i) => {
        const inits = p.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: '#101520', border: '1.5px solid rgba(0,212,170,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700, color: '#00d4aa', overflow: 'hidden' }}>
              {p.photoUrl
                ? <img src={`/persons/${p.photoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                : inits}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fullName}</div>
              {p.title && <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#4a5568' }}>{p.title}</div>}
            </div>
          </div>
        );
      })}
    </RSection>
  );
}

function ClientsSection({ companyNodeId }: { companyNodeId: string }) {
  const { data: risks, loading } = useCompanyEdgeRisk(companyNodeId);
  const items = ((risks ?? []) as any[]).filter((r: any) => r.edgeType === 'supply' || r.edgeType === 'finances');
  return (
    <RSection title="Key Clients / Partners">
      {loading && <LoadText />}
      {!loading && !items.length && <EmptyText label="No client data" />}
      {items.slice(0, 5).map((r: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0, background: 'rgba(59,139,212,0.12)', border: '1px solid rgba(59,139,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700, color: '#3b8bd4' }}>
            {r.targetLabel?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.targetLabel}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#4a5568' }}>{r.edgeType} · score {r.score?.toFixed(1)}</div>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, color: riskColor(r.severityLevel ?? 2), flexShrink: 0 }}>{r.score?.toFixed(1)}</span>
        </div>
      ))}
    </RSection>
  );
}

function CommoditiesSection({ companyId }: { companyId: number }) {
  const { data: commodities, loading } = useCompanyCommodities(companyId);
  const items = (commodities ?? []) as any[];
  return (
    <RSection title="Commodity Exposure">
      {loading && <LoadText />}
      {!loading && !items.length && <EmptyText label="No commodity data" />}
      {items.slice(0, 6).map((c: any, i: number) => {
        const dep = dependencyColor(c.dependencyLevel);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ flex: 1, fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.82)' }}>{c.commodityName}</div>
            <span style={{ fontFamily: FONT_MONO, fontSize: 7, color: dep.text, background: dep.bg, borderRadius: 2, padding: '1px 4px' }}>{c.dependencyLevel}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: '#00e5ff', width: 32, textAlign: 'right' }}>{c.exposurePercentage}%</span>
          </div>
        );
      })}
    </RSection>
  );
}

function SectorSection({ company }: { company: Company }) {
  const rows = [
    company.marketCapUsd ? { k: 'Market Cap', v: fmtCap(company.marketCapUsd) } : null,
    company.revenueUsd   ? { k: 'Revenue FY', v: fmtCap(company.revenueUsd) }   : null,
    company.category     ? { k: 'Sector',     v: company.category.toUpperCase() } : null,
    company.employees    ? { k: 'Employees',  v: company.employees.toLocaleString() } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  if (!rows.length) return null;
  return (
    <RSection title="Sector Position">
      {rows.map(r => (
        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{r.k}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 600, color: '#e8edf5' }}>{r.v}</span>
        </div>
      ))}
    </RSection>
  );
}

function StockStrip({ company }: { company: Company }) {
  if (!company.ticker) return null;
  return (
    <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(9,11,16,0.96)', flexShrink: 0, direction: 'ltr' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ flexShrink: 0, padding: '4px 10px', background: '#111620', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8 }}>{company.ticker}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700, color: '#00d4aa' }}>{fmtCap(company.marketCapUsd)}</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 16 }}>
            {[8,6,10,12,14,16].map((h, i) => <div key={i} style={{ width: 4, height: h, borderRadius: '1px 1px 0 0', background: '#a855f7', opacity: 0.4 + i * 0.1 }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function RSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ ...labelCss }}>{title}</div>
      {children}
    </div>
  );
}

function LoadText() { return <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>; }
function EmptyText({ label }: { label: string }) { return <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{label}</div>; }
