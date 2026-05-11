import type { CompanyMarket } from '@/types/companyMarket';
import { glass, PANEL_TOP, CHART_STRIP_H } from './shared';
import type { NavTab } from './shared';
import OperationsPanel from './OperationsPanel';
import '@/app/styles/overlay.scss';

interface Props {
  activeTab: NavTab;
  markets:   CompanyMarket[];
  fabrics:   any[];
  products:  any[];
}

export default function FirstPanel({ activeTab, markets, fabrics, products }: Props) {
  return (
    <div
      id="company-first-panel"
      className="co-first"
      style={{ top: PANEL_TOP, bottom: CHART_STRIP_H }}
    >
      <div className="co-first__title">
        {activeTab === 'Overview' ? 'OPERATIONS' : activeTab.toUpperCase()}
      </div>

      {activeTab === 'Overview' && (
        <OperationsPanel markets={markets} fabrics={fabrics} products={products} />
      )}
      {activeTab !== 'Overview' && (
        <div style={{ ...glass, padding: '20px 14px', textAlign: 'center' }}>
          <div className="co-first__placeholder">
            {activeTab} — coming soon
          </div>
        </div>
      )}
    </div>
  );
}
