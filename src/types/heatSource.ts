import { User as CommonUser, AuthResponse as CommonAuthResponse } from './auth';  // Используем общие типы для авторизации
export type User = CommonUser;
export type AuthResponse = CommonAuthResponse;

// Интерфейс для данных, полученных от API
export interface ApiHeatSource {
  id: number;
  name: string;
  hs_type_id: number;
  owner_id: number;
  org_id: number;
  hs_period_id: number;
  oks_id: number;
  created_at: string | null;
  updated_at: string | null;
  power?: string;
  yearBuilt?: string;
  year?: string;
  consumers?: string;
  settlement?: string;
  // Добавленные свойства
  region?: string;
  address_id?: number;
  supply_address_ids?: number[];
  // Новые поля для теплоисточников
  installed_capacity_gcal_hour?: string;
  available_capacity_gcal_hour?: string;
  primary_fuel_type?: string;
  secondary_fuel_type?: string;
  temperature_schedule?: string;
  data_transmission_start_date?: string;
  // Существующие свойства
  address?: {
    name?: string;
    settlement?: string;
  } | string;
  type?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  } | string;
  owner?: {
    id: number;
    name: string;
    inn: string;
    created_at: string;
    updated_at: string;
  } | string;
  org?: {
    id: number;
    name: string;
    inn: string;
    created_at: string;
    updated_at: string;
  } | string;
  period?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  } | string;
  operationPeriod?: string;
  oks?: {
    id: number;
    name: string;
    address?: {
      name?: string;
      settlement?: string;
      region?: string;
      address_id?: number;
      supply_address_ids?: number[];
    }
  };
}

// Интерфейс для отображения данных в компоненте
export interface HeatSource {
  id: number;
  owner: string;
  operator: string;
  sourceName: string;
  installed_capacity_gcal_hour?: string;
  available_capacity_gcal_hour?: string;
  address: string;
  type: string;
  primary_fuel_type?: string;
  secondary_fuel_type?: string;
  temperature_schedule?: string;
  operationPeriod: string;
  yearBuilt: string;
  data_transmission_start_date?: string;
  consumers: string;
}

// Интерфейс для состояния компонента
export interface HeatSourceState {
  heatSources: HeatSource[];
  loading: boolean;
  error: string | null;
  selectedSettlement: string | null;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  success: string; // Строковый тип для success: '', 'success', 'partial' и т.д.
}