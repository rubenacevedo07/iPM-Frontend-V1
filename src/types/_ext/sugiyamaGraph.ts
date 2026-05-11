// Frontend-only types for the Wall Street PowerView Sugiyama layout.
// Separate from graphView.ts because the node shape is intentionally different
// (compact 40px fixed-height pill, no avatar, no score badge).

export interface SugiyamaNodeData extends Record<string, unknown> {
  label:       string
  typeLabel:   string
  initials:    string
  borderColor: string
  nodeWidth:   number
}
