import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { CompanyProvider } from '@/types/companyProvider';
import { FONT_SANS, C_HQ, C_PROVIDER, C_CLIENT, glass, labelCss, CHART_STRIP_H, FCF_LABELS, FCF_VALUES } from './shared';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface Props {
  providers: CompanyProvider[];
  clients:   { id: number; clientId: number; clientName: string; contractValue: number }[];
}

export default function BottomChartStrip({ providers, clients }: Props) {
  const fcfData = {
    labels: FCF_LABELS,
    datasets: [{
      data: FCF_VALUES,
      borderColor: C_HQ,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: C_HQ,
      tension: 0.4,
      fill: false,
    }],
  };

  const fcfOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9, family: FONT_SANS } },
        grid:  { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9, family: FONT_SANS } },
        grid:  { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'absolute',
        bottom: 0, left: 268, right: 280,
        height: CHART_STRIP_H, zIndex: 10,
        ...glass,
        borderRadius: '8px 8px 0 0',
        padding: '10px 18px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ ...labelCss, marginBottom: 0 }}>Free Cash Flow (B)</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { color: C_HQ,       label: 'Selected HQ' },
            { color: C_PROVIDER, label: `${providers.length} Providers` },
            { color: C_CLIENT,   label: `${clients.length} Clients` },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
              <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Line data={fcfData} options={fcfOptions as any} />
      </div>
    </motion.div>
  );
}
