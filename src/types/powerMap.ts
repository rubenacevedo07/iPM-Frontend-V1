import type { Company } from './company';
import type { Country } from './country';

/** Interface for GET /api/PowerMapLayers/by-map/{id} */
export interface PowerMapLayer {
  id:          number;
  powerMapId:  number;
  level:       number;
  name:        string;
  description: string;
  tier:        number;
  tierName:    string;
}

/** Interface for GET /api/PowerMapElements/by-layer/{id} */
export interface PowerMapElement {
  id:               number;
  layerId:          number;
  powerMapId:       number;
  name:             string;
  tier:             number;
  tierName:         string;
  level:            number;
  description:      string;
  shortDescription: string;
}

/** Interface for GET /api/PowerMaps/{id} */
export interface PowerMap {
  id:          number;
  name:        string;
  description: string;
  sector:      string;
  sectorId:    number;
  capital:     number;
  layers:      PowerMapLayer[];
  elements:    PowerMapElement[];
}

/** Interface for GET /api/PowerMaps (Summary list) */
export interface PowerMapSummary {
  id:          number;
  name:        string;
  description: string;
  sector:      string;
  sectorId:    number;
  capital:     number;
}

// Keep existing relation interfaces if still needed
export interface PowerMapCompanyCountry {
  id:          number;
  powerMapId:  number;
  companyId:   number;
  countryId:   number;
  description: string;
  company:     Company;
  country:     Country;
}