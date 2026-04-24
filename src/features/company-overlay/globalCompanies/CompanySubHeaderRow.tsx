import { motion } from 'framer-motion';
import type { Company } from '@/types/company';
import '@/app/styles/overlay.scss';
import { COMPANY_ROW_H, SUB_ROW_H, fmtCap } from './shared';

interface Props {
  company: Company;
}

export default function CompanySubHeaderRow({ company }: Props) {
  return (
    <motion.div
      id="company-subheader"
      className="co-sub"
      key={company.id + '-sub'}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      style={{ top: COMPANY_ROW_H, height: SUB_ROW_H }}
    >
      {/* KPIs */}
      <div className="co-sub__kpis">
        {[
          { label: 'MARKET CAP', value: fmtCap(company.marketCapUsd) },
          { label: 'REVENUE',    value: fmtCap(company.revenueUsd) },
          { label: 'NET INCOME', value: fmtCap(company.netIncomeUsd) },
        ].map(s => (
          <div key={s.label} className="co-sub__kpi">
            <span className="co-sub__kpi-label">{s.label}</span>
            <span className="co-sub__kpi-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Status pills — pushed to the right via margin-left: auto */}
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
