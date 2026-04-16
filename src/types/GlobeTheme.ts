export interface GlobeTheme {
  id: string;
  name: string;
  // Background
  bgColor: string;
  // Globe surface
  globeGridColor: string;
  globeGridOpacity: number;
  landColor: string;
  landOpacity: number;
  atmosphereColor: string;
  // Nodes
  nodeColorByType: Record<string, string>;
  nodeRadiusScale: number;
  nodePulse: boolean;
  // Arcs — gradient source→target
  arcSourceColor: string;
  arcTargetColor: string;
  arcOpacity: number;
  arcWidth: number;
  arcHeight: number;
  pulseSpeed: number;
  // Effects
  useAdditiveBlending: boolean;
  showNeuralGrid: boolean;
  neuralGridColor: string;
  bloomEnabled: boolean;
  fogEnabled: boolean;
}
