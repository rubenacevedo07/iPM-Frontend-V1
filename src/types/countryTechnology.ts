/**
 * countryTechnology.ts  —  types/countryTechnology.ts
 *
 * TypeScript interfaces for the CountryTechnologies API.
 * Endpoint: GET /api/CountryTechnologies/country/{id}
 */

export interface CountryTechnology {
  id:            number;
  countryId:     number;
  category:      string;   // "Software & AI" | "Hardware" | "Defense & Aerospace" | ...
  techName:      string;
  masteryLevel:  string;   // "Leader" | "Advanced" | "Developing"
  autonomyScore: number;   // 0–100

  country: null | {
    id:   number;
    name: string;
    bloc: string;
  };
}
