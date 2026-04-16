/**
 * countryRelation.ts  —  types/countryRelation.ts
 *
 * TypeScript interfaces for the CountryRelations API.
 * Endpoint: GET /api/CountryRelations
 */

export interface CountryRelation {
  id:               number;
  countryId:        number;
  targetId:         number;
  relationTypeId:   number;
  relationCategory: string;
  strengthScore:    number;
  riskLevel:        string;   // "Low" | "Medium" | "High" | "Critical"
  description:      string;
  country:          null | { id: number; name: string; bloc: string; };
  relationType:     null | { id: number; name: string; };
  target:           null | { id: number; name: string; bloc: string; };
}
