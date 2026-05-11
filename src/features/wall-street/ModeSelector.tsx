import { Link } from '@tanstack/react-router'
import styles from './ModeSelector.module.scss'

const CYAN = '#00e5ff'

function PowerPreview() {
  return (
    <svg viewBox="0 0 240 200" className={styles.previewSvg} aria-hidden>
      <g stroke={CYAN} strokeOpacity={0.3} strokeWidth={1} fill="none">
        <path d="M120 50 L60 110" />
        <path d="M120 50 L120 110" />
        <path d="M120 50 L180 110" />
        <path d="M60 110 L40 170" />
        <path d="M120 110 L100 170" />
        <path d="M120 110 L140 170" />
        <path d="M180 110 L200 170" />
      </g>
      <g fill={CYAN}>
        <circle cx={120} cy={50}  r={11} />
        <circle cx={60}  cy={110} r={7} fillOpacity={0.85} />
        <circle cx={120} cy={110} r={7} fillOpacity={0.85} />
        <circle cx={180} cy={110} r={7} fillOpacity={0.85} />
        <circle cx={40}  cy={170} r={5} fillOpacity={0.7} />
        <circle cx={100} cy={170} r={5} fillOpacity={0.7} />
        <circle cx={140} cy={170} r={5} fillOpacity={0.7} />
        <circle cx={200} cy={170} r={5} fillOpacity={0.7} />
      </g>
    </svg>
  )
}

function CommandPreview() {
  return (
    <svg viewBox="0 0 240 200" className={styles.previewSvg} aria-hidden>
      <g stroke={CYAN} strokeOpacity={0.3} strokeWidth={1} fill="none">
        <path d="M120 25 L120 60" />
        <path d="M120 60 L120 100" />
        <path d="M120 100 L80 140" />
        <path d="M120 100 L160 140" />
        <path d="M80 140 L60 175" />
        <path d="M80 140 L100 175" />
        <path d="M160 140 L140 175" />
        <path d="M160 140 L180 175" />
      </g>
      <g fill={CYAN}>
        <circle cx={120} cy={25}  r={9}  fillOpacity={0.95} />
        <circle cx={120} cy={60}  r={8}  fillOpacity={0.85} />
        <circle cx={120} cy={100} r={8}  fillOpacity={0.85} />
        <circle cx={80}  cy={140} r={6.5} fillOpacity={0.75} />
        <circle cx={160} cy={140} r={6.5} fillOpacity={0.75} />
        <circle cx={60}  cy={175} r={4.5} fillOpacity={0.6} />
        <circle cx={100} cy={175} r={4.5} fillOpacity={0.6} />
        <circle cx={140} cy={175} r={4.5} fillOpacity={0.6} />
        <circle cx={180} cy={175} r={4.5} fillOpacity={0.6} />
      </g>
    </svg>
  )
}

function PassivePreview() {
  return (
    <svg viewBox="0 0 240 200" className={styles.previewSvg} aria-hidden>
      <g stroke={CYAN} strokeOpacity={0.4} fill="none">
        <path d="M70 50  L170 50"  strokeWidth={3.5} />
        <path d="M70 50  L170 100" strokeWidth={2.5} />
        <path d="M70 100 L170 50"  strokeWidth={3} />
        <path d="M70 100 L170 100" strokeWidth={3.5} />
        <path d="M70 100 L170 150" strokeWidth={3} />
        <path d="M70 150 L170 50"  strokeWidth={1.5} />
      </g>
      <g fill={CYAN}>
        <circle cx={70}  cy={50}  r={10} />
        <circle cx={70}  cy={100} r={10} />
        <circle cx={70}  cy={150} r={10} />
        <circle cx={170} cy={50}  r={10} />
        <circle cx={170} cy={100} r={10} />
        <circle cx={170} cy={150} r={10} />
      </g>
      <g
        fill="#94a3b8"
        fontFamily="JetBrains Mono, monospace"
        fontSize={9}
        textAnchor="middle"
      >
        <text x={120} y={47}>8.5%</text>
        <text x={120} y={97}>7.0%</text>
      </g>
    </svg>
  )
}

interface CardProps {
  number: string
  view: 'power' | 'command' | 'passive'
  title: string
  subtitle: string
  preview: React.ReactNode
}

function ModeCard({ number, view, title, subtitle, preview }: CardProps) {
  return (
    <Link
      to="/wall-street"
      search={{ view }}
      className={styles.card}
    >
      <div className={styles.cardNumber}>{number}</div>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardSubtitle}>{subtitle}</div>
      <div className={styles.cardPreview}>{preview}</div>
      <div className={styles.cardCta}>→ View</div>
    </Link>
  )
}

export function ModeSelector() {
  return (
    <div className={styles.selectorRoot}>
      <h1 className={styles.heading}>Wall Street Power Graph</h1>
      <p className={styles.dek}>Pick a view. Each one answers one question in 2 seconds.</p>

      <div className={styles.cardGrid}>
        <ModeCard
          number="01"
          view="power"
          title="Who runs it"
          subtitle="The 10 names that move markets."
          preview={<PowerPreview />}
        />
        <ModeCard
          number="02"
          view="command"
          title="Chain of command"
          subtitle="From the US Government down to bank CEOs."
          preview={<CommandPreview />}
        />
        <ModeCard
          number="03"
          view="passive"
          title="Passive money"
          subtitle="Who actually owns Apple, Microsoft, Nvidia."
          preview={<PassivePreview />}
        />
      </div>

      <div className={styles.advancedRow}>
        <Link to="/wall-street" search={{ view: 'advanced' }} className={styles.advancedLink}>
          Advanced mode →
        </Link>
      </div>
    </div>
  )
}
