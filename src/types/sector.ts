/**
 * sector.ts  —  types/sector.ts
 */

export interface Sector {
  id:          number;
  name:        string;
  code:        string;
  description: string;
  isActive:    boolean;
  createdAt:   string; // ISO Date string
}