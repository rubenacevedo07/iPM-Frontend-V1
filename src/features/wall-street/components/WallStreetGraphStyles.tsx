export function WallStreetGraphStyles() {
  return (
    <style>{`
      @keyframes wsSingleParticle {
        to { stroke-dashoffset: -1; }
      }
      @keyframes wsEdgePulse {
        0%   { opacity: 0.3; stroke-width: 2; }
        100% { opacity: 0;   stroke-width: 6; }
      }
      @keyframes wsEdgeSelectPulse {
        0%   { opacity: 0.4; stroke-width: 4; }
        50%  { opacity: 0.1; stroke-width: 8; }
        100% { opacity: 0.4; stroke-width: 4; }
      }
      .ws-flow .react-flow__edge-path {
        transition: stroke-width 0.22s ease, opacity 0.22s ease;
      }
    `}</style>
  )
}
