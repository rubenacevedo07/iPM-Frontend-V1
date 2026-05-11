import { motion } from 'framer-motion';
import type { Company } from '@/types/company';
import type { CompanySector } from '@/types/companySector';
import CompanyLogo from '@/features/company-overlay/CompanyLogo';
import '@/app/styles/overlay.scss';
import { COMPANY_ROW_H, NAV_TABS } from './shared';
import type { NavTab } from './shared';

interface Props {
  company:     Company;
  sectors:     CompanySector[];
  activeTab:   NavTab;
  onTabChange: (t: NavTab) => void;
}

export default function CompanyHeaderRow({ company, sectors, activeTab, onTabChange }: Props) {
  return (
    <motion.div
      id="company-header"
      className="co-hdr"
      key={company.id}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      style={{ height: COMPANY_ROW_H }}
    >
      <div className="co-hdr__inner">
        {/* Logo */}
        <div className="co-hdr__logo">
          <CompanyLogo company={company} size={52} />
        </div>

        {/* Name + pill — baseline-aligned so pill bottom sits on name text baseline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div className="co-hdr__name">{company.name}</div>
          <div className="co-hdr__middle">
            {(() => {
              const primary = sectors.find(s => s.isPrimary) ?? (company.category ? { sectorName: company.category, sectorId: 0 } : null);
              return primary ? (
                <span key={primary.sectorId} className="co-hdr__pill co-hdr__pill--primary">
                  {primary.sectorName}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        {/* Nav tabs */}
        <div className="co-hdr__tabs">
          {NAV_TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                className={`co-hdr__tab ${active ? 'co-hdr__tab--active' : 'co-hdr__tab--inactive'}`}
                onClick={() => onTabChange(tab)}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
