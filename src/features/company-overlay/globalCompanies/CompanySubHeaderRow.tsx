import { motion } from 'framer-motion';
import type { Company } from '@/types/company';
import '@/app/styles/overlay.scss';
import 'flag-icons/css/flag-icons.min.css';
import { SUB_ROW_H, COUNTRY_ISO } from './shared';

interface Props {
  company:    Company;
  onCeoClick?: () => void;
}

export default function CompanySubHeaderRow({ company, onCeoClick }: Props) {
  return (
    <motion.div
      id="company-subheader"
      className="co-sub"
      key={company.id + '-sub'}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      style={{ height: SUB_ROW_H }}
    >
      {/* Meta (replaces KPIs) */}
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

      {/* Status pills */}
      <div className="co-sub__pills">
        <div className="co-sub__pill co-sub__pill--live">
          <span className="co-sub__pill-dot" />
          LIVE DATA
        </div>
        <div className="co-sub__pill co-sub__pill--sphere">
          <span className="co-sub__pill-dot" />
          SPHERE VIEW
        </div>
        <div className="co-sub__pill co-sub__pill--category">
          <span className="co-sub__pill-dot" />
          {company.category.toUpperCase().slice(0, 18)}
        </div>
      </div>
    </motion.div>
  );
}
