import { motion } from 'framer-motion';
import type { Company } from '@/types/company';
import type { CompanySector } from '@/types/companySector';
import CompanyLogo from '@/features/company-overlay/CompanyLogo';
import 'flag-icons/css/flag-icons.min.css';
import '@/app/styles/overlay.scss';
import { COMPANY_ROW_H, NAV_TABS, COUNTRY_ISO } from './shared';
import type { NavTab } from './shared';

interface Props {
  company:     Company;
  sectors:     CompanySector[];
  activeTab:   NavTab;
  onTabChange: (t: NavTab) => void;
  onCeoClick?: () => void;
}

export default function CompanyHeaderRow({ company, sectors, activeTab, onTabChange, onCeoClick }: Props) {
  return (
    <motion.div
      id="company-header"
      className="co-hdr"
      key={company.id}
      initial={{ opacity: 0, y: -12 }}
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

        {/* Name */}
        <div className="co-hdr__name">{company.name}</div>

        {/* Middle column: pills + meta */}
        <div className="co-hdr__middle">
          {/* Primary sector pill only */}
          <div className="co-hdr__pills">
            {(() => {
              const primary = sectors.find(s => s.isPrimary) ?? (company.category ? { sectorName: company.category, sectorId: 0 } : null);
              return primary ? (
                <span key={primary.sectorId} className="co-hdr__pill co-hdr__pill--primary">
                  {primary.sectorName}
                </span>
              ) : null;
            })()}
          </div>

          {/* Meta bar */}
          <div className="co-hdr__meta">
            {([
              company.country      ? { flag: true as const, country: company.country, text: company.country } : null,
              company.headquarters ? { text: company.headquarters } : null,
              company.ceo          ? { text: `CEO: ${company.ceo}`, ceo: true as const } : null,
              company.employees    ? { text: `${company.employees.toLocaleString()} employees` } : null,
            ].filter((x): x is NonNullable<typeof x> => x != null)).map((item, i) => {
              const iso = 'flag' in item ? (COUNTRY_ISO[item.text] ?? '').toLowerCase() : '';
              const isFlag = 'flag' in item;
              return (
                <span key={i} className="co-hdr__meta-item">
                  {i > 0 && <span className="co-hdr__meta-sep">·</span>}
                  {isFlag && iso && (
                    <span className={`fi fi-${iso} fis co-hdr__meta-flag`} />
                  )}
                  {!isFlag && 'ceo' in item && onCeoClick ? (
                    <span className="co-hdr__meta-ceo" onClick={onCeoClick}>
                      {item.text}
                    </span>
                  ) : !isFlag ? (
                    <span className="co-hdr__meta-text">{item.text}</span>
                  ) : null}
                </span>
              );
            })}
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
