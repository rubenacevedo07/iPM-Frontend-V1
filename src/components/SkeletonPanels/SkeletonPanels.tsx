import s from './SkeletonPanels.module.scss'

function Bar({ w, h, style }: { w?: string | number; h: number; style?: React.CSSProperties }) {
  return <div className={s.bar} style={{ width: w, height: h, ...style }} />
}

export function PersonOverlaySkeleton() {
  return (
    <div className={s.personHost}>
      <div className={s.header}>
        <div className={s.avatar} />
        <div className={s.headerText}>
          <Bar w="42%" h={13} />
          <Bar w="26%" h={10} />
        </div>
        <div className={s.headerPills}>
          <div className={s.pill} style={{ width: 52 }} />
          <div className={s.pill} style={{ width: 100 }} />
          <div className={s.pill} style={{ width: 72 }} />
        </div>
      </div>

      <div className={s.left}>
        <Bar w="100%" h={110} style={{ borderRadius: 6 }} />
        <Bar w="75%"  h={11} />
        <Bar w="55%"  h={11} />
        <Bar w="65%"  h={11} />
        <Bar w="45%"  h={11} />
        <Bar w="60%"  h={11} />
      </div>

      <div className={s.right}>
        <Bar w="100%" h={28} style={{ borderRadius: 4, marginBottom: 6 }} />
        <Bar w="100%" h={72} style={{ borderRadius: 4 }} />
        <Bar w="100%" h={72} style={{ borderRadius: 4 }} />
        <Bar w="100%" h={72} style={{ borderRadius: 4 }} />
      </div>

      <div className={s.bottom}>
        <Bar w={100} h={13} />
        <Bar w={70}  h={13} />
        <Bar w={90}  h={13} />
      </div>
    </div>
  )
}

export function CompanyOverlaySkeleton() {
  return (
    <div className={s.personHost}>
      <div className={s.header}>
        <div className={s.avatar} style={{ borderRadius: 4 }} />
        <div className={s.headerText}>
          <Bar w="38%" h={13} />
          <Bar w="22%" h={10} />
        </div>
        <div className={s.headerPills}>
          <div className={s.pill} style={{ width: 80 }} />
          <div className={s.pill} style={{ width: 80 }} />
          <div className={s.pill} style={{ width: 80 }} />
        </div>
      </div>

      <div className={s.left}>
        <Bar w="100%" h={130} style={{ borderRadius: 6 }} />
        <Bar w="80%"  h={11} />
        <Bar w="60%"  h={11} />
        <Bar w="70%"  h={11} />
      </div>

      <div className={s.right}>
        <Bar w="100%" h={28} style={{ borderRadius: 4, marginBottom: 6 }} />
        <Bar w="100%" h={90} style={{ borderRadius: 4 }} />
        <Bar w="100%" h={90} style={{ borderRadius: 4 }} />
      </div>

      <div className={s.bottom}>
        <Bar w={90}  h={13} />
        <Bar w={70}  h={13} />
        <Bar w={110} h={13} />
      </div>
    </div>
  )
}

// Generic overlay skeleton — used for gold overlay while its panels load.
export function GoldOverlaySkeleton() {
  return (
    <div className={s.personHost}>
      <div className={s.header}>
        <div className={s.headerText}>
          <Bar w="30%" h={13} />
        </div>
        <div className={s.headerPills}>
          <div className={s.pill} style={{ width: 80 }} />
          <div className={s.pill} style={{ width: 80 }} />
        </div>
      </div>
    </div>
  )
}

export function GraphSkeleton() {
  const nodes = [
    { top: '50%', left: '50%', w: 56, h: 56, ml: -28, mt: -28 },
    { top: '18%', left: '50%', w: 38, h: 38, ml: -19, mt: -19 },
    { top: '78%', left: '30%', w: 34, h: 34, ml: -17, mt: -17 },
    { top: '75%', left: '68%', w: 34, h: 34, ml: -17, mt: -17 },
    { top: '38%', left: '20%', w: 30, h: 30, ml: -15, mt: -15 },
    { top: '38%', left: '80%', w: 30, h: 30, ml: -15, mt: -15 },
    { top: '22%', left: '28%', w: 26, h: 26, ml: -13, mt: -13 },
    { top: '22%', left: '72%', w: 26, h: 26, ml: -13, mt: -13 },
  ]
  return (
    <div className={s.graphHost}>
      <div className={s.graphNodes}>
        {nodes.map((n, i) => (
          <div
            key={i}
            className={s.graphNode}
            style={{
              top: n.top,
              left: n.left,
              width: n.w,
              height: n.h,
              marginLeft: n.ml,
              marginTop: n.mt,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function PowerMapsSkeleton() {
  return (
    <div className={s.powerMapsHost}>
      <Bar w="60%" h={11} />
      <Bar w="100%" h={32} style={{ borderRadius: 4 }} />
      <Bar w="100%" h={32} style={{ borderRadius: 4 }} />
      <Bar w="100%" h={32} style={{ borderRadius: 4 }} />
      <Bar w="100%" h={32} style={{ borderRadius: 4 }} />
    </div>
  )
}
