import type { Company } from '@/types/company';
import type { CompanyProvider } from '@/types/companyProvider';
import 'flag-icons/css/flag-icons.min.css';
import '@/app/styles/overlay.scss';
import { fmtCap, COUNTRY_ISO } from './shared';
import CompanyLogo from '@/features/company-overlay/CompanyLogo';

interface Props {
  providers:   CompanyProvider[];
  clients:     { id: number; clientId: number; clientName: string; contractValue: number }[];
  companyById: Record<number, Company>;
}

export default function NetworkPanel({ providers, clients, companyById }: Props) {
  return (
    <div id="company-network-panel" className="co-net">
      {/* Top Suppliers */}
      <div className="co-net__section">
        <div className="co-net__label">Top Suppliers</div>
        {providers.filter(p => p.provider).length === 0 ? (
          <div className="co-net__empty">No data</div>
        ) : (
          <div className="co-net__list">
            {providers.filter(p => p.provider).slice(0, 4).map((p, i) => {
              const iso = (COUNTRY_ISO[p.provider.country] ?? '').toLowerCase();
              return (
                <div key={i} className="co-net__row">
                  {iso
                    ? <span className={`fi fi-${iso} fis co-net__flag`} />
                    : <span className="co-net__flag-fallback">🌐</span>
                  }
                  <span className="co-net__name">{p.provider.name}</span>
                  <span className="co-net__val co-net__val--provider">{fmtCap(p.contractValue)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Clients */}
      <div className="co-net__section">
        <div className="co-net__label">Top Clients</div>
        {clients.length === 0 ? (
          <div className="co-net__empty">No data</div>
        ) : (
          <div className="co-net__list">
            {clients.slice(0, 4).map((c, i) => {
              const co = companyById[c.clientId];
              return (
                <div key={i} className="co-net__row">
                  {co
                    ? <CompanyLogo company={co} size={22} />
                    : <span className="co-net__globe-fallback">🌐</span>
                  }
                  <span className="co-net__name">{c.clientName}</span>
                  <span className="co-net__val co-net__val--client">{fmtCap(c.contractValue)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
