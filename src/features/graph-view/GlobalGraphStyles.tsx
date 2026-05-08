export function GlobalGraphStyles() {
  return (
    <style>{`
      @keyframes singleParticle {
        to { stroke-dashoffset: -1; }
      }
      @keyframes edgePulse {
        0%   { opacity: 0.3; stroke-width: 2; }
        100% { opacity: 0;   stroke-width: 6; }
      }
      @keyframes edgeSelectPulse {
        0%   { opacity: 0.4; stroke-width: 4; }
        50%  { opacity: 0.1; stroke-width: 8; }
        100% { opacity: 0.4; stroke-width: 4; }
      }
      @keyframes miniPanelIn {
        from { opacity: 0; transform: scale(0.88) translateY(6px); }
        to   { opacity: 1; transform: scale(1)    translateY(0); }
      }
      .react-flow__edge-path {
        transition: stroke-width 0.22s ease, opacity 0.22s ease;
      }
      .react-flow__edge:hover .react-flow__edge-path {
        stroke-width: 2.5;
      }
    `}</style>
  )
}
