import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Company } from '@/types/company';
import { useAlphaCashFlow } from '@/hooks/useAlphaCashFlow';
import { useEarnings }      from '@/hooks/useAlphaEarnings';
import FCFLineChart            from '../charts/FCFLineChart';
import CashFlowWaterfallChart  from '../charts/CashFlowWaterfallChart';
import AnnualEPSTrendChart     from '../charts/AnnualEPSTrendChart';
import YoYEPSGrowthChart       from '../charts/YoYEPSGrowthChart';
import QuarterlyEPSTrendChart  from '../charts/QuarterlyEPSTrendChart';
import QuarterlyEPSSurpriseChart from '../charts/QuarterlyEPSSurpriseChart';
import ChartPlaceholder        from '../charts/ChartPlaceholder';
import { glass, FONT_SANS, FONT_MONO, PANEL_TOP, CHART_STRIP_H } from './shared';

interface Props {
  company: Company;
}

export default function TraderViewPanel({ company }: Props) {
  const [symbol, setSymbol] = useState<string>(company.ticker ?? '');
  const [inputVal, setInputVal] = useState<string>(company.ticker ?? '');

  // Reset when the selected company changes
  useEffect(() => {
    const t = company.ticker ?? '';
    setSymbol(t);
    setInputVal(t);
  }, [company.id]);

  const { data: cashFlowData, loading: lCF,      error: eCF }       = useAlphaCashFlow(symbol);
  const { data: earningsData, loading: lEarnings, error: eEarnings } = useEarnings(symbol);

  const isFetching = lCF || lEarnings;
  const hasError   = symbol && (eCF || eEarnings);

  function submitTicker() {
    setSymbol(inputVal.toUpperCase().trim());
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        top: PANEL_TOP, left: 0, right: 0, bottom: CHART_STRIP_H,
        zIndex: 10,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'auto',
      }}
    >
      {/* ── Header bar ── */}
      <div style={{
        ...glass,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Left: label + company name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Trader View
          </span>
          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12 }}>·</span>
          <span style={{
            fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {company.name}
          </span>
        </div>

        {/* Right: ticker input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Ticker
          </span>
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') submitTicker(); }}
            onBlur={submitTicker}
            placeholder="e.g. AAPL"
            style={{
              width: 96, padding: '5px 10px', fontSize: 12, fontWeight: 700,
              fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5, color: '#e8e6de', outline: 'none',
            }}
          />
          {isFetching && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              Loading…
            </span>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {hasError && (
        <div style={{
          ...glass,
          padding: '8px 14px',
          borderColor: 'rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.85)', fontFamily: FONT_SANS }}>
            {eCF ?? eEarnings}
          </span>
        </div>
      )}

      {/* ── Content area ── */}
      {!symbol ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Enter a ticker symbol above to load financial charts
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
          {/* Row 1: FCF + Cash Flow Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {cashFlowData?.annual?.length
              ? <FCFLineChart annual={cashFlowData.annual} />
              : <ChartPlaceholder title="Free Cash Flow (FCF)" loading={lCF} />}
            {cashFlowData?.annual?.length
              ? <CashFlowWaterfallChart annual={cashFlowData.annual} />
              : <ChartPlaceholder title="Cash Flow Breakdown" loading={lCF} />}
          </div>
          {/* Row 2: Annual EPS Trend + YoY EPS Growth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {earningsData?.annual?.length
              ? <AnnualEPSTrendChart annual={earningsData.annual} />
              : <ChartPlaceholder title="Annual EPS Trend" loading={lEarnings} />}
            {earningsData?.annual?.length
              ? <YoYEPSGrowthChart annual={earningsData.annual} />
              : <ChartPlaceholder title="YoY EPS Growth" loading={lEarnings} />}
          </div>
          {/* Row 3: Quarterly EPS Trend + EPS Surprise */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {earningsData?.quarterly?.length
              ? <QuarterlyEPSTrendChart quarterly={earningsData.quarterly} />
              : <ChartPlaceholder title="Quarterly EPS Trend" loading={lEarnings} />}
            {earningsData?.quarterly?.length
              ? <QuarterlyEPSSurpriseChart quarterly={earningsData.quarterly} />
              : <ChartPlaceholder title="Quarterly EPS Surprise" loading={lEarnings} />}
          </div>
        </div>
      )}
    </motion.div>
  );
}
