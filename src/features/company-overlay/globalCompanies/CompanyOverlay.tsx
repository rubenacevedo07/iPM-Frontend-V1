import { useState } from 'react';
import type { Company } from '@/types/company';
import type { CompanySector } from '@/types/companySector';
import { FONT_SANS, FONT_MONO, fmtCap, COMPANY_ROW_H } from './shared';
import type { NavTab } from './shared';
import { useCompanySectors } from '@/hooks/useCompanyData';
import CompanyHeaderRow      from './CompanyHeaderRow';
import { CompanyLeftPanel }  from './CompanyLeftPanel';
import { CompanyCenterPanel } from './CompanyCenterPanel';
import type { CanvasMode }    from './CompanyCenterPanel';
import { CompanyRightPanel }  from './CompanyRightPanel';

const BOTBAR_H = 30;
const COL_L_W  = 260;
const COL_R_W  = 290;

type LeftTab = 'KEY DATA' | 'RISK' | 'OWNERSHIP' | 'FACTORIES';
type PCCTab  = 'PERSONS'  | 'CLIENTS' | 'COMMODITIES';

interface Props {
  company: Company;
  onClose: () => void;
}

export function CompanyOverlay({ company, onClose }: Props) {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('MAP');
  const [leftTab,    setLeftTab]    = useState<LeftTab>('KEY DATA');
  const [pccTab,     setPccTab]     = useState<PCCTab>('PERSONS');
  const [navTab,     setNavTab]     = useState<NavTab>('Overview');
  const { data: sectors } = useCompanySectors(company.id);
  const safeSectors = (sectors ?? []) as CompanySector[];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#090b10', color: '#e8edf5', fontFamily: FONT_SANS, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Close button — floating over CompanyHeaderRow top-right */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', top: 10, right: 14, zIndex: 70, cursor: 'pointer', width: 28, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1, transition: 'all 0.12s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
      >×</div>

      {/* Company header — logo · name · sector pills · meta · nav tabs */}
      <div style={{ position: 'relative', height: COMPANY_ROW_H, flexShrink: 0 }}>
        <CompanyHeaderRow
          company={company}
          sectors={safeSectors}
          activeTab={navTab}
          onTabChange={setNavTab}
        />
      </div>

      {/* 3-column */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `${COL_L_W}px 1fr ${COL_R_W}px`, overflow: 'hidden', minHeight: 0 }}>
        <CompanyLeftPanel  company={company} activeTab={leftTab}  onTabChange={setLeftTab} />
        <CompanyCenterPanel company={company} canvasMode={canvasMode} onModeChange={setCanvasMode} />
        <CompanyRightPanel  company={company} companyNodeId={`company:${company.id}`} activeTab={pccTab} onTabChange={setPccTab} />
      </div>

      {/* Bottom bar */}
      <div style={{ height: BOTBAR_H, flexShrink: 0, background: 'rgba(9,11,16,0.96)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', zIndex: 60 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ label: 'VIEWING', value: company.name.toUpperCase() }, company.marketCapUsd ? { label: 'MARKET CAP', value: fmtCap(company.marketCapUsd) } : null].filter(Boolean).map((s: any) => (
            <span key={s.label} style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{s.label} <span style={{ color: '#a855f7' }}>{s.value}</span></span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 7px', borderRadius: 3, background: 'rgba(0,212,170,0.08)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.25)' }}>● LIVE</span>
          {company.isChokepoint && <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 7px', borderRadius: 3, background: 'rgba(229,57,53,0.08)', color: '#e53935', border: '1px solid rgba(229,57,53,0.25)' }}>⚠ CHOKEPOINT</span>}
          {company.category && <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 7px', borderRadius: 3, background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>{company.category.toUpperCase()}</span>}
        </div>
      </div>
    </div>
  );
}

