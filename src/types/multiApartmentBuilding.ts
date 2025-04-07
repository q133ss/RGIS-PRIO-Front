import { AuthResponse as CommonAuthResponse } from './auth';

// Используем общий тип для авторизации
export type AuthResponse = CommonAuthResponse;

// Table column definition
export interface TableColumn {
  id: string;
  title: string;
  width: number;
  visible: boolean;
  field: keyof MultiApartmentBuilding | 'actions';
}

// Interface for nested API objects
export interface ApiCity {
  id: number;
  name: string;
  region_id: number | null;
  created_at: string;
  updated_at: string;
  region: any | null;
}

export interface ApiStreet {
  id: number;
  name: string;
  shortName: string | null;
  city_id: number;
  created_at: string;
  updated_at: string;
  city: ApiCity;
}

export interface ApiAddress {
  id: number;
  street_id: number;
  house_number: string;
  building: string | null;
  structure: string | null;
  literature: string | null;
  created_at: string;
  updated_at: string;
  street: ApiStreet;
}

export interface ApiHouseCondition {
  id: number;
  actual: boolean;
  code: string;
  createDate: string;
  guid: string;
  houseCondition: string;
  lastUpdateDate: string;
  created_at: string;
  updated_at: string;
}

export interface ApiHouseType {
  id: number;
  createDate: string;
  guid: string;
  houseTypeName: string;
  created_at: string;
  updated_at: string;
}

export interface ApiOrganization {
  id: number;
  fullName: string;
  inn: string;
  ogrn: string;
  orgAddress: string;
  phone: string;
  shortName: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

// Interface for MKD data from the real API
export interface ApiMultiApartmentBuilding {
  id: number;
  entrance_count: number | null;
  address_id: number;
  buildingYear: string;
  cadastreNumber: string;
  guid: string | null;
  house_condition_id: number;
  house_type_id: number;
  management_org_id: number;
  municipality_org_id: number;
  planSeries: string;
  status: string;
  created_at: string;
  updated_at: string;
  address: ApiAddress;
  house_condition: ApiHouseCondition;
  house_type: ApiHouseType;
  management_org: ApiOrganization;
  municipality_org: ApiOrganization;
  
  // Add these optional fields for additional data
  floors?: string;
  apartments?: string;
  totalArea?: string;
}

// Interface for MKD creation/update request
export interface ApiMultiApartmentBuildingRequest {
  entrance_count?: number | null;
  address_id: number;
  buildingYear: string;
  cadastreNumber: string;
  house_condition_id: number;
  house_type_id: number;
  management_org_id: number;
  municipality_org_id: number;
  planSeries?: string;
  status?: string;
  
  // Add optional fields that may be supported by the API in the future
  floors?: string;
  apartments?: string;
  totalArea?: string;
}

// Interface for displaying data in a component
export interface MultiApartmentBuilding {
  id: number;
  address: string;         // Address
  settlement: string;      // Settlement
  yearBuilt: string;       // Year built
  floors: string;          // Floors
  entrances: string;       // Entrances (may not be in API)
  apartments: string;      // Apartments (may not be in API)
  totalArea: string;       // Total area (may not be in API)
  managementCompany: string; // Management company
  technicalCondition: string; // Technical condition
}

// Interface for component state
export interface MultiApartmentBuildingState {
  buildings: MultiApartmentBuilding[];
  loading: boolean;
  error: string | null;
  selectedSettlement: string | null;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  success: string;
}

// Interface for MKD edit form
// This is an intermediate interface to simplify form handling,
// which will then be converted to ApiMultiApartmentBuildingRequest
export interface BuildingFormData {
  address: string;
  settlement: string;
  buildingYear: string;
  maxFloorCount: string;
  entrances: string; // May be absent in API, but needed for the form
  apartments: string; // May be absent in API, but needed for the form
  totalArea: string; // May be absent in API, but needed for the form
  managementOrganizationId: number;
  houseConditionId: number;
  // Additional fields to match API
  address_id?: number;
  cadastreNumber?: string;
}