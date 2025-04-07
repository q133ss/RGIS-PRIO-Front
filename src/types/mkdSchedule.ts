// Complete types for MKD (Multi-apartment building) schedules

export interface City {
  id: number;
  name: string;
  region_id: number | null;
  created_at: string;
  updated_at: string;
  region: any | null;
}

export interface Street {
  id: number;
  name: string;
  shortName: string | null;
  city_id: number;
  created_at: string;
  updated_at: string;
  city: City;
}

export interface Address {
  id: number;
  street_id: number;
  house_number: string;
  building: string | null;
  structure: string | null;
  literature: string | null;
  latitude?: string;
  longitude?: string;
  created_at: string;
  updated_at: string;
  street: Street;
}

export interface HouseCondition {
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

export interface HouseType {
  id: number;
  createDate: string;
  guid: string;
  houseTypeName: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
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

export interface MkdBuilding {
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
  address: Address;
  house_condition: HouseCondition;
  house_type: HouseType;
  management_org: Organization;
  municipality_org: Organization;
  // Heating schedule fields
  planned_disconnection_date?: string | null;
  actual_disconnection_date?: string | null;
  planned_connection_date?: string | null;
  actual_connection_date?: string | null;
  disconnection_order?: string | null;
  connection_order?: string | null;
}

export interface MkdBuildingsPaginatedResponse {
  current_page: number;
  data: MkdBuilding[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface MkdScheduleState {
  mkdBuildings: MkdBuilding[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  success: string;
  filterCity: string;
  filterStreet: string;
  filterHouseNumber: string;
  filterYear: string;
}

export interface MkdQueryParams {
  region_id?: number;
  city_id?: number;
  street_id?: number;
  address_id?: number;
  buildingYear?: string;
  municipality_org_id?: number;
  management_org_id?: number;
}

// Type for updating MKD schedule
export interface MkdScheduleUpdate {
  planned_disconnection_date: string | null;
  actual_disconnection_date: string | null;
  planned_connection_date: string | null;
  actual_connection_date: string | null;
  disconnection_order: string | null;
  connection_order: string | null;
}

// Type for schedule history item
export interface MkdScheduleHistoryItem {
  id: number;
  mkd_id: number;
  planned_disconnection_date: string | null;
  actual_disconnection_date: string | null;
  planned_connection_date: string | null;
  actual_connection_date: string | null;
  disconnection_order: string | null;
  connection_order: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_by_user?: {
    id: number;
    name: string;
  };
  updated_by_user?: {
    id: number;
    name: string;
  };
}

// Type for heating season
export interface HeatingSeasonInfo {
  id: number;
  year: string;
  standard_start_date: string;
  standard_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: 'active' | 'completed' | 'planned';
  region_id: number | null;
  city_id: number | null;
  created_at: string;
  updated_at: string;
  region?: {
    id: number;
    name: string;
  };
  city?: {
    id: number;
    name: string;
  };
}

// Type for bulk schedule update request
export interface BulkScheduleUpdateRequest {
  building_ids: number[];
  schedule: MkdScheduleUpdate;
}

// API response for MKD Buildings - can be used when returning multiple buildings with pagination
export interface ApiResponse<T> {
  data: T;
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
  message?: string;
  status?: string | number;
}