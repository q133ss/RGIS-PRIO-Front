// Базовые типы для инцидентов и связанных сущностей
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
    created_at: string;
    updated_at: string;
    latitude: number;
    longitude: number;
    street: Street;
  }
  
  export interface IncidentType {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface ResourceType {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface IncidentStatus {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface HeatSource {
    id: number;
    name: string;
    sourceName?: string;
    address?: string;
    power?: string;
    operationPeriod?: string;
    created_at: string;
    updated_at: string;
    addresses?: Address[];
  }
  
  export interface Incident {
    id: number;
    title: string;
    description: string;
    incident_type_id: number;
    incident_resource_type_id: number;
    incident_status_id: number;
    is_complaint: boolean;
    created_at: string;
    updated_at: string;
    addresses: Address[];
    type: IncidentType;
    resource_type: ResourceType;
    status: IncidentStatus;
    heat_source?: HeatSource;
  }
  
  export interface IncidentsResponse {
    current_page: number;
    data: Incident[];
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