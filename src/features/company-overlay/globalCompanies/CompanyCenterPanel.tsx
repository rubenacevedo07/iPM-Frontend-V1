import { useCompanyProviders, useCompanyProducts } from '@/hooks/useCompanyData';
import { FONT_SANS, FONT_MONO, fmtCap, countryToFlag } from './shared';
import type { Company } from '@/types/company';

export type CanvasMode = 'MAP' | 'SUPPLY CHAIN' | 'RELATIONS' | 'EVENTS' | 'POWER MAPS' | 'INFRA';
const CANVAS_MODES: CanvasMode[] = ['MAP', 'SUPPLY CHAIN', 'RELATIONS', 'EVENTS', 'POWER MAPS', 'INFRA'];

interface Props {
  company:      Company;
  canvasMode:   CanvasMode;
  onModeChange: (m: CanvasMode) => void;
}

export function CompanyCenterPanel({ company, canvasMode, onModeChange }: Props) {
  const { data: providers } = useCompanyProviders(company.id);
  const { data: products }  = useCompanyProducts(company.id);
  const safeProviders = (providers as any[]) ?? [];
  const safeProducts  = (products  as any[]) ?? [];

  return (
    <div style={{ position: 'relative', background: '#090b10', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Mode tabs */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', background: 'rgba(9,11,16,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, overflow: 'hidden', backdropFilter: 'blur(12px)', zIndex: 20 }}>
        {CANVAS_MODES.map(mode => {
          const active = mode === canvasMode;
          return (
            <div key={mode} onClick={() => onModeChange(mode)} style={{
              padding: '6px 12px', fontFamily: FONT_MONO, fontSize: 7, letterSpacing: '0.6px',
              color: active ? '#a855f7' : '#8a9bb5', background: active ? 'rgba(168,85,247,0.07)' : 'transparent',
              borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(22,29,44,1)'; e.currentTarget.style.color = '#e8edf5'; }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a9bb5'; }}}
            >{mode}</div>
          );
        })}
      </div>

      {/* MAP */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'MAP' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}>
        <CompanyGlobe company={company} />
        {company.marketCapUsd && (
          <div style={{ position: 'absolute', top: '16%', left: '18%', padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.06)', fontFamily: FONT_MONO, fontSize: 8, color: '#a855f7', backdropFilter: 'blur(8px)' }}>
            ⚡ {fmtCap(company.marketCapUsd)}
          </div>
        )}
        {company.headquarters && (
          <div style={{ position: 'absolute', bottom: '20%', left: '16%', padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(55,138,221,0.25)', background: 'rgba(55,138,221,0.05)', fontFamily: FONT_MONO, fontSize: 8, color: '#378ADD', backdropFilter: 'blur(8px)' }}>
            {countryToFlag(company.country)} {company.headquarters}
          </div>
        )}
        {company.revenueUsd && (
          <div style={{ position: 'absolute', top: '20%', right: '14%', padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.05)', fontFamily: FONT_MONO, fontSize: 8, color: '#f5a623', backdropFilter: 'blur(8px)' }}>
            📊 Revenue {fmtCap(company.revenueUsd)}
          </div>
        )}
      </div>

      {/* SUPPLY CHAIN */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'SUPPLY CHAIN' ? 'block' : 'none', overflowY: 'auto', padding: '56px 20px 60px' }}>
        <SupplyChainView company={company} providers={safeProviders} products={safeProducts} />
      </div>

      {/* RELATIONS */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'RELATIONS' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,11,16,0.9)' }}>
        <RelationsView company={company} />
      </div>

      {/* EVENTS */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'EVENTS' ? 'block' : 'none', overflowY: 'auto', padding: '56px 20px 60px' }}>
        <EventsView company={company} />
      </div>

      {/* POWER MAPS */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'POWER MAPS' ? 'flex' : 'none', flexDirection: 'column', gap: 10 }}>
        <PowerMapsView company={company} />
      </div>

      {/* INFRA */}
      <div style={{ position: 'absolute', inset: 0, display: canvasMode === 'INFRA' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,11,16,0.9)' }}>
        <InfraView company={company} />
      </div>

      {canvasMode === 'MAP' && <GlobeNav />}

      {/* Atlas strip */}
      <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, padding: '9px 14px', background: 'rgba(9,11,16,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, backdropFilter: 'blur(12px)', zIndex: 10, display: 'flex', gap: 10 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#a855f7', letterSpacing: '1px', flexShrink: 0, marginTop: 1 }}>✦</span>
        <span style={{ fontFamily: FONT_SANS, fontSize: 9, color: '#8a9bb5', lineHeight: 1.5 }}>
          {company.aiNarrative
            ? company.aiNarrative.slice(0, 220) + (company.aiNarrative.length > 220 ? '…' : '')
            : `${company.name} is a ${company.category?.toLowerCase() ?? 'global entity'} with ${company.employees ? company.employees.toLocaleString() + ' employees' : 'significant global presence'}. ${company.isChokepoint ? '⚠ Classified as a systemic chokepoint.' : 'Monitor for network centrality and edge risk propagation.'}`}
        </span>
      </div>
    </div>
  );
}

function CompanyGlobe({ company }: { company: Company }) {
  const abbr = company.name.slice(0, 2).toUpperCase();
  return (
    <svg width="660" height="580" viewBox="0 0 660 580">
      <defs>
        <radialGradient id="coGlobe" cx="36%" cy="32%">
          <stop offset="0%" stopColor="#1a1030" /><stop offset="55%" stopColor="#0c0f1e" /><stop offset="100%" stopColor="#060814" />
        </radialGradient>
        <clipPath id="coClip"><circle cx="330" cy="290" r="260" /></clipPath>
      </defs>
      <circle cx="330" cy="290" r="267" fill="none" stroke="rgba(168,85,247,0.12)" strokeWidth="7" />
      <circle cx="330" cy="290" r="260" fill="url(#coGlobe)" stroke="rgba(168,85,247,0.22)" strokeWidth="1.5" />
      <g clipPath="url(#coClip)" stroke="rgba(255,255,255,0.05)" strokeWidth=".5" fill="none">
        <ellipse cx="330" cy="290" rx="260" ry="42" /><ellipse cx="330" cy="290" rx="260" ry="104" />
        <line x1="330" y1="30" x2="330" y2="550" /><line x1="180" y1="62" x2="480" y2="518" />
      </g>
      <g clipPath="url(#coClip)">
        <path d="M 180 200 Q 228 172 264 188 Q 279 215 264 264 Q 246 296 222 304 Q 196 296 180 272 Q 162 248 180 200 Z" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.2" />
        <path d="M 316 184 Q 348 168 370 184 Q 381 202 372 224 Q 358 235 336 230 Q 313 222 311 202 Z" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.35)" strokeWidth="1" />
        <path d="M 425 174 Q 490 160 520 182 Q 531 204 515 232 Q 490 248 459 242 Q 426 228 420 204 Z" fill="rgba(245,166,35,0.1)" stroke="rgba(245,166,35,0.3)" strokeWidth=".8" />
      </g>
      <path d="M 224 240 Q 275 192 330 212" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" strokeDasharray="5,4"><animate attributeName="stroke-dashoffset" values="0;-18" dur="2s" repeatCount="indefinite" /></path>
      <circle cx="225" cy="240" r="18" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.6)" strokeWidth="2" />
      <text x="225" y="244" textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="700" fill="#a855f7">{abbr}</text>
    </svg>
  );
}

function GlobeNav() {
  return (
    <div style={{ position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)', display: 'flex', background: 'rgba(9,11,16,0.88)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, overflow: 'hidden', backdropFilter: 'blur(12px)', zIndex: 10 }}>
      {['⚡ EVENTS', '⏱ TIMELINES', '🗺 POWER MAP', '⚓ CHOKEPOINTS'].map((label, i, arr) => (
        <div key={label} style={{ padding: '7px 12px', fontFamily: FONT_MONO, fontSize: 7, letterSpacing: '0.7px', color: i === 0 ? '#00d4aa' : '#8a9bb5', background: i === 0 ? 'rgba(0,212,170,0.06)' : 'transparent', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', cursor: 'pointer' }}>{label}</div>
      ))}
    </div>
  );
}

function SupplyChainView({ company: _company, providers, products }: { company: Company; providers: any[]; products: any[] }) {
  const tiers = [
    { label: 'OWNS / CONTROLS', nodes: products.slice(0, 4).map(p => ({ name: p.productName ?? p.name, detail: p.sku ?? '', color: '#a855f7' })) },
    { label: 'SUPPLIED BY', nodes: providers.slice(0, 4).map(p => ({ name: p.provider?.name ?? 'Provider', detail: `EdgeStrength ${p.edgeStrength ?? '—'}`, color: '#378ADD' })) },
  ].filter(t => t.nodes.length > 0);
  if (!tiers.length) return <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingTop: 8 }}>No supply chain data</div>;
  return (
    <>
      {tiers.map(tier => (
        <div key={tier.label} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: '1.5px', color: '#4a5568', textTransform: 'uppercase', marginBottom: 8 }}>{tier.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tier.nodes.map((node, i) => (
              <div key={i} style={{ padding: '7px 12px', borderRadius: 5, cursor: 'pointer', background: `${node.color}08`, border: `1px solid ${node.color}40`, transition: 'all 0.15s' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700, color: node.color }}>{node.name}</div>
                {node.detail && <div style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#4a5568', marginTop: 2 }}>{node.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function RelationsView({ company }: { company: Company }) {
  return (
    <div style={{ textAlign: 'center', fontFamily: FONT_MONO, fontSize: 9, color: '#4a5568', lineHeight: 2 }}>
      Relations network · open edges<br /><br />
      <span style={{ color: '#a855f7' }}>Owns →</span> Subsidiaries<br />
      <span style={{ color: '#378ADD' }}>Finances →</span> Gov &amp; institutional bonds<br />
      <span style={{ color: '#00d4aa' }}>Controls →</span> {company.ceo ?? 'Executive leadership'}<br />
      <span style={{ color: '#f5a623' }}>Supplies →</span> Clients via contracts
    </div>
  );
}

function EventsView({ company }: { company: Company }) {
  const events = [
    { tag: 'STRATEGY', tagColor: '#a855f7', age: '2d ago', body: `${company.name} strategic position update.`, note: 'Edge risk scores recalculated.' },
    { tag: 'REGULATORY', tagColor: '#e53935', age: '1w ago', body: `Regulatory review opened into ${company.name} operations.`, note: 'CorporateRiskScore elevated.' },
    { tag: 'PRODUCT', tagColor: '#00e5ff', age: '2w ago', body: `${company.name} product milestone reached.`, note: 'IPI impact +2.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((ev, i) => (
        <div key={i} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 7, padding: '2px 7px', borderRadius: 2, background: `${ev.tagColor}12`, color: ev.tagColor, border: `1px solid ${ev.tagColor}30` }}>{ev.tag}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{ev.age}</span>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: '#e8edf5', lineHeight: 1.4, marginBottom: 5 }}>{ev.body}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{ev.note}</div>
        </div>
      ))}
    </div>
  );
}

function PowerMapsView({ company }: { company: Company }) {
  return (
    <div style={{ padding: '56px 20px 60px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%' }}>
      {[
        { name: 'Financial Power Map', detail: `${company.name} · related institutions · treasury links`, active: true },
        { name: 'Supply Chain Network', detail: `${company.name} → Tier-1/2 suppliers → commodity nodes` },
        { name: 'Regulatory Risk Map', detail: 'Jurisdictional exposure · SEC/EU/APAC regulatory nodes', muted: true },
      ].map((m, i) => (
        <div key={i} style={{ background: '#111620', border: `1px solid ${m.muted ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 7, padding: 12, cursor: 'pointer', opacity: m.muted ? 0.5 : 1 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, marginBottom: 4, color: m.muted ? '#4a5568' : '#e8edf5' }}>{m.name}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: '#4a5568' }}>{m.detail}</div>
        </div>
      ))}
    </div>
  );
}

function InfraView({ company }: { company: Company }) {
  return (
    <div style={{ textAlign: 'center', fontFamily: FONT_MONO, fontSize: 9, color: '#4a5568', lineHeight: 2.2 }}>
      Infrastructure nodes<br /><br />
      {company.headquarters && <>{countryToFlag(company.country)} {company.country} · {company.headquarters}<br /></>}
      {company.employees && <>👥 {company.employees.toLocaleString()} employees globally<br /></>}
      {company.founded && <>📅 Founded {company.founded}<br /></>}
    </div>
  );
}
