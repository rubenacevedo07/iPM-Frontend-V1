import type { Company } from '@/types/company';
import type { CompanyProvider } from '@/types/companyProvider';
import { FONT_SANS, glass, PANEL_TOP, CHART_STRIP_H } from './shared';
import type { NavTab } from './shared';
import NetworkPanel from './NetworkPanel';

interface Props {
  activeTab:   NavTab;
  providers:   CompanyProvider[];
  clients:     { id: number; clientId: number; clientName: string; contractValue: number }[];
  companyById: Record<number, Company>;
}

export default function SecondPanel({ activeTab, providers, clients, companyById }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: PANEL_TOP, right: 0, bottom: CHART_STRIP_H,
        width: 280, zIndex: 10,
        padding: '14px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
        overflowY: 'auto', pointerEvents: 'none',
      }}
    >
      <div style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', paddingLeft: 2 }}>
        NETWORK
      </div>

      {activeTab === 'Overview' && (
        <NetworkPanel providers={providers} clients={clients} companyById={companyById} />
      )}
      {activeTab !== 'Overview' && (
        <div style={{ ...glass, padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {activeTab} — coming soon
          </div>
        </div>
      )}
    </div>
  );
}
