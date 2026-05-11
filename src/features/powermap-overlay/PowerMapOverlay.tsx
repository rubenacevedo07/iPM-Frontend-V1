import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  FONT_SANS, FONT_MONO,
  COMPANY_ROW_H, SUB_ROW_H, PANEL_TOP, CHART_STRIP_H,
  glass, labelCss,
} from '@/features/company-overlay/globalCompanies/shared'
import '@/app/styles/overlay.scss'
import type { PowerMapOverlayContent } from './powerMapContent'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const NAV_TABS = ['Overview', 'Actors', 'Forecast', 'Sources'] as const
type NavTab = typeof NAV_TABS[number]

const STRENGTH_COLOR: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: '#dc2626',
  High:     '#f59e0b',
  Medium:   '#3b82f6',
  Low:      '#94a3b8',
}

interface PowerMapOverlayProps {
  content: PowerMapOverlayContent
  onClose: () => void
}

export function PowerMapOverlay({ content, onClose }: PowerMapOverlayProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('Overview')
  const accent = content.accentColor

  const chartData = {
    labels: content.timeline.points.map(p => p.x),
    datasets: [{
      data: content.timeline.points.map(p => p.y),
      borderColor: accent,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: accent,
      tension: 0.4,
      fill: false,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9, family: FONT_SANS } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9, family: FONT_SANS } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  // Depth panel — same background as company overlay's `glass` (shared.ts),
  // plus the gold overlay's layered shadow + accent-tinted border for depth.
  const depthPanel: CSSProperties = {
    background:           'rgba(4, 6, 9, 0.84)',
    border:               `1px solid ${accent}20`,
    borderRadius:         10,
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow:            '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

      {/* ─── Close button — OUTSIDE scroll container so it stays visible ── */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', top: 10, right: 14, zIndex: 70, cursor: 'pointer',
          width: 28, height: 28, borderRadius: 4,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1, pointerEvents: 'auto',
        }}
      >×</div>

      {/* ─── Scroll container ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        overflowY: 'auto', overflowX: 'hidden',
        pointerEvents: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}>

        {/* ─── Hero (100vh) — wraps the original absolute-positioned chrome ─ */}
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>

          {/* HeaderRow (.co-hdr) */}
          <div className="co-hdr" style={{ height: COMPANY_ROW_H }}>
            <div className="co-hdr__inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div className="co-hdr__name">{content.title}</div>
              </div>

              <div className="co-hdr__tabs">
                {NAV_TABS.map(t => {
                  const active = t === activeTab
                  return (
                    <button
                      key={t}
                      className={`co-hdr__tab ${active ? 'co-hdr__tab--active' : 'co-hdr__tab--inactive'}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SubHeaderRow (.co-sub) */}
          <div className="co-sub" style={{ height: SUB_ROW_H }}>
            <div className="co-hdr__meta">
              {content.meta.map((m, i) => (
                <span key={i} className="co-hdr__meta-item">
                  {i > 0 && <span className="co-hdr__meta-sep">·</span>}
                  <span className="co-hdr__meta-text">{m.text}</span>
                </span>
              ))}
            </div>

            <div className="co-sub__pills">
              <div className="co-sub__pill co-sub__pill--live">
                <span className="co-sub__pill-dot" />
                LIVE DATA
              </div>
              <div className="co-sub__pill co-sub__pill--sphere">
                <span className="co-sub__pill-dot" />
                MAP VIEW
              </div>
              <div className="co-sub__pill co-sub__pill--category">
                <span className="co-sub__pill-dot" />
                {content.category.slice(0, 18)}
              </div>
            </div>
          </div>

          {/* LeftPanel: Actors + KeyData */}
          <div style={{
            position: 'absolute', left: 0, width: 268, top: PANEL_TOP, bottom: CHART_STRIP_H, zIndex: 10,
            padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ ...labelCss, marginBottom: 0 }}>KEY ACTORS</div>
            <div style={{ ...depthPanel, overflow: 'hidden' }}>
              {content.actors.map((a, i) => (
                <div key={a.id} style={{
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, boxShadow: `0 0 6px ${a.color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...labelCss, marginTop: 8, marginBottom: 0 }}>KEY DATA</div>
            <div style={{ ...depthPanel, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              {content.keyData.map((kv, i) => {
                const isFirstCol = i % 3 === 0
                const isSecondRow = i >= 3
                return (
                  <div key={i} style={{
                    padding: '8px 10px',
                    borderLeft: !isFirstCol ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    borderTop:  isSecondRow ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {kv.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, color: kv.color ?? '#e2e8f0', marginTop: 2 }}>
                      {kv.value}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RightPanel: Connections */}
          <div style={{
            position: 'absolute', right: 0, width: 280, top: PANEL_TOP, bottom: CHART_STRIP_H, zIndex: 10,
            padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ ...labelCss, marginBottom: 4 }}>CONNECTIONS</div>
            <div style={{ ...depthPanel, overflow: 'hidden' }}>
              {content.connections.map((c, i) => {
                const stripeColor = c.hostile ? '#dc2626' : '#00e5ff'
                const sc = STRENGTH_COLOR[c.strength]
                return (
                  <div key={i} style={{
                    padding: '10px 12px 10px 16px',
                    display: 'flex', gap: 10,
                    position: 'relative',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: stripeColor, boxShadow: `0 0 8px ${stripeColor}80` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.fromName} <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span> {c.toName}
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.label}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                      color: sc, background: `${sc}12`, border: `1px solid ${sc}40`,
                      padding: '2px 6px', borderRadius: 3, alignSelf: 'center', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{c.strength}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* BottomChartStrip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 268, right: 280, height: CHART_STRIP_H, zIndex: 10,
            ...glass, borderRadius: '8px 8px 0 0', padding: '10px 18px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ ...labelCss, marginBottom: 0 }}>{content.timeline.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 5px ${accent}` }} />
                <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Incidents</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Line data={chartData} options={chartOptions as any} />
            </div>
          </div>

        </div>
        {/* ─── /Hero ──────────────────────────────────────────────────────── */}

        {/* ─── Row 1: Recent Incidents (gold-style depth panel) ───────────── */}
        <section style={{ padding: '32px 24px 0' }}>
          <div style={{ ...labelCss, marginBottom: 12 }}>RECENT INCIDENTS · 90 DAYS</div>
          <div style={{ ...depthPanel, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {content.incidents.map((inc, i) => {
              const sev = STRENGTH_COLOR[inc.severity]
              return (
                <div key={i} style={{
                  padding: '18px 20px',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140,
                }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {inc.date}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {inc.location}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, flex: 1 }}>
                    {inc.description}
                  </div>
                  <div style={{
                    alignSelf: 'flex-start',
                    fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                    color: sev, background: `${sev}12`, border: `1px solid ${sev}40`,
                    padding: '3px 8px', borderRadius: 3, textTransform: 'uppercase',
                  }}>{inc.severity}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── Row 2: Regional Dependency (gold-style depth panel) ────────── */}
        <section style={{ padding: '24px 24px 48px' }}>
          <div style={{ ...labelCss, marginBottom: 12 }}>REGIONAL DEPENDENCY</div>
          <div style={{ ...depthPanel, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {content.regionalImpact.map((r, i) => {
              const isFirstCol = i % 3 === 0
              const isSecondRow = i >= 3
              return (
                <div key={i} style={{
                  padding: '18px 20px',
                  borderLeft: !isFirstCol ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderTop:  isSecondRow ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {r.region}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>
                    {r.dependencyPct}%
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${r.dependencyPct}%`, height: '100%', background: accent, boxShadow: `0 0 8px ${accent}80` }} />
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
                    {r.note}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
      {/* ─── /scroll container ──────────────────────────────────────────── */}
    </div>
  )
}
