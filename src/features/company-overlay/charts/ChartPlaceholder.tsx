interface Props {
  title?:   string
  loading?: boolean
}

export default function ChartPlaceholder({ title, loading }: Props) {
  return (
    <div
      className="co-chart-placeholder"
      style={{
        minHeight: 140,
        display:   'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:   'rgba(16,20,32,0.4)',
        borderRadius: 6,
        border:       '1px solid rgba(255,255,255,0.05)',
        fontSize:     11,
        color:        'rgba(255,255,255,0.3)',
        gap: 6,
      }}
    >
      {title && <span>{title}</span>}
      {loading && <span>Loading…</span>}
    </div>
  )
}
