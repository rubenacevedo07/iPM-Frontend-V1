/**
 * assetManagerCompany.ts  —  types/assetManagerCompany.ts
 *
 * TypeScript interfaces for the AssetManagerCompany API.
 *
 * Endpoints:
 *   GET /api/AssetManagerCompany/manager/{id}/companies → ManagerCompany[]
 *   GET /api/AssetManagerCompany/company/{id}/detailed  → AssetManagerCompanyDetailed[]
 *   GET /api/AssetManagerCompany/company/{id}/oci       → CompanyOci
 *   GET /api/AssetManagerCompany/company/{id}/full      → AssetManagerCompanyFull[]
 */

/** Nested asset manager object inside a manager-companies record */
export interface ManagerCompanyManager {
  id:   number;
  name: string;
  logo: string | null;
}

/** Ownership record returned by GET /api/AssetManagerCompany/manager/{id}/companies */
export interface ManagerCompany {
  companyId:             number;
  companyName:           string;
  ownershipPercentage:   number;
  relativeConcentration: number;
  isMajorHolder:         boolean;
  reportDate:            string;
  assetManager:          ManagerCompanyManager;
}

/** Detailed ownership record for a company */
export interface AssetManagerCompanyDetailed {
  id:                     number;
  assetManagerId:         number;
  assetManagerName:       string;
  assetManagerLogo:       string | null;
  companyId:              number;
  ownershipPercentage:    number;
  reportDate:             string;   // ISO date string
  ownershipType:          string;   // e.g. "Institutional"
  source:                 string;
  hasVotingRights:        boolean;
  relativeConcentration:  number;
  isMajorHolder:          boolean;
  notes:                  string;
}

/** Ownership Concentration Index score for a company */
export interface CompanyOci {
  companyId: number;
  oci:       number;
}

/** Nested company object inside a full ownership record */
export interface AssetManagerCompanyFullCompany {
  id:      number;
  name:    string;
  country: string;
}

/** Nested asset manager object inside a full ownership record */
export interface AssetManagerCompanyFullManager {
  id:   number;
  name: string;
  logo: string | null;
}

/** Full ownership record with nested company and asset manager objects */
export interface AssetManagerCompanyFull {
  company:               AssetManagerCompanyFullCompany;
  assetManager:          AssetManagerCompanyFullManager;
  ownershipPercentage:   number;
  relativeConcentration: number;
  isMajorHolder:         boolean;
  reportDate:            string;   // ISO date string
  notes:                 string;
}
