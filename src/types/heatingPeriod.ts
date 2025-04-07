export interface HeatingPeriodAddress {
    house_number: string;
    street: string;
    city: string;
  }
  
  export interface HeatingPeriod {
    id: number;
    address: HeatingPeriodAddress;
    planned_disconnection_date: string;
    planned_connection_date: string;
    actual_disconnection_date: string | null;
    actual_connection_date: string | null;
    disconnection_order?: string; // Реквизиты приказа об отключении
    connection_order?: string;    // Реквизиты приказа о включении
  }
  
  export interface HeatingPeriodState {
    heatingPeriods: HeatingPeriod[];
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    success: string;
    filterCity: string;
    filterStreet: string;
    filterHouseNumber: string;
  }
  
  export interface HeatingPeriodApiResponse {
    items: HeatingPeriod[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
  }