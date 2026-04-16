/**
 * companyIntelligenceService.ts
 *
 * Service functions for the three company intelligence endpoints:
 *   Timelines, News, EdgeRiskScore — all keyed by graph nodeId (e.g. "company:42").
 */

import { API_COMPANIES } from '../config/apiConfig';

export const companyIntelligenceService = {
  /** GET /api/Timelines/by-entity?nodeId={nodeId}&status=Open */
  async getTimelines(nodeId: string): Promise<unknown[]> {
    const url = `${API_COMPANIES}/Timelines/by-entity?nodeId=${encodeURIComponent(nodeId)}&status=Open`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  /** GET /api/NewsEvents?entityNodeId={nodeId}&limit=20 */
  async getNews(nodeId: string): Promise<unknown[]> {
    const url = `${API_COMPANIES}/NewsEvents?entityNodeId=${encodeURIComponent(nodeId)}&limit=20`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  /** GET /api/EdgeRiskScore?nodeId={nodeId}&sort=score_desc */
  async getEdgeRisks(nodeId: string): Promise<unknown[]> {
    const url = `${API_COMPANIES}/EdgeRiskScore?nodeId=${encodeURIComponent(nodeId)}&sort=score_desc`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
};
