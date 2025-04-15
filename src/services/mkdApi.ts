import {
  MultiApartmentBuilding,
  ApiMultiApartmentBuildingRequest,
  AuthResponse
} from '../types/multiApartmentBuilding';
import { 
  MkdScheduleUpdate,
  MkdScheduleHistoryItem,
  HeatingSeasonInfo
} from '../types/mkdSchedule';
import { login as loginApi, isAuthenticated, TOKEN_KEY } from './api';

const API_URL = import.meta.env.VITE_API_URL;

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  return await loginApi(username, password);
};

const fetchAPI = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem(TOKEN_KEY);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    throw new Error('Authentication token missing');
  }

  try {
    console.log(`Executing request: ${API_URL}${endpoint}`);
    if (options.body) {
      console.log('Request data:', JSON.parse(options.body as string));
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      console.error(`Request error: ${response.status}`, endpoint);

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Re-authorization required');
      }

      if (response.status === 403) {
        throw new Error('You do not have sufficient permissions to perform this operation');
      }

      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        throw new Error(errorData.message || `Request error: ${response.status}`);
      } catch (e) {
        throw new Error(`Request error: ${response.status}`);
      }
    }

    if (response.status === 204) {
      return true;
    }

    const data = await response.json();
    console.log('Data received:', data);
    return data;
  } catch (error) {
    console.error('Error during request execution:', error);
    throw error;
  }
};

export const initializeApi = async (): Promise<void> => {
  try {
    if (isAuthenticated()) {
      try {
        await fetchAPI('/mkd');
        console.log('Existing token is valid');
        return;
      } catch (error) {
        console.log('Token is invalid or an error occurred');
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Authorization required');
      }
    } else {
      throw new Error('Authorization required');
    }
  } catch (error) {
    console.error('API initialization error:', error);
    throw error;
  }
};

export const getMultiApartmentBuildings = async (page = 1): Promise<{
  items: MultiApartmentBuilding[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    const response = await fetchAPI(`/mkd?page=${page}`);

    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: adaptMultiApartmentBuildingsFromApi(response.data),
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      const items = adaptMultiApartmentBuildingsFromApi(response);
      return {
        items,
        currentPage: 1,
        totalPages: 1,
        totalItems: items.length
      };
    } else {
      console.warn('Unexpected response format when getting MKD list:', response);
      return { items: [], currentPage: 1, totalPages: 1, totalItems: 0 };
    }
  } catch (error) {
    console.error('Error fetching buildings list:', error);
    throw error;
  }
};

export const searchMultiApartmentBuildings = async (query: string): Promise<MultiApartmentBuilding[]> => {
  try {
    const response = await fetchAPI(`/mkd?q=${encodeURIComponent(query)}`);

    let buildings: any[] = [];

    if (response && response.data && Array.isArray(response.data)) {
      buildings = response.data;
    } else if (Array.isArray(response)) {
      buildings = response;
    } else {
      console.warn('Unexpected response format when searching MKDs:', response);
      return [];
    }

    if (query && buildings.length > 0) {
        const lowerQuery = query.toLowerCase();
        buildings = buildings.filter(building => {
            const searchFields = [
                building.address?.street?.name,
                building.address?.house_number,
                building.address?.street?.city?.name,
                building.buildingYear,
                building.cadastreNumber,
                building.management_org?.shortName,
                building.management_org?.fullName
            ];

            return searchFields.some(field =>
                field != null && String(field).toLowerCase().includes(lowerQuery)
            );
        });
    }

    return adaptMultiApartmentBuildingsFromApi(buildings);
  } catch (error) {
    console.error('Error searching MKDs:', error);
    throw error;
  }
};

export const exportMultiApartmentBuildingsToExcel = async (): Promise<Blob> => {
  try {
    console.log('Generating CSV file on client side');
    const { items } = await getMultiApartmentBuildings(1);

    if (!items || items.length === 0) {
      console.warn('No data to export');
      return new Blob([''], { type: 'text/csv;charset=utf-8;' });
    }

    const headers = 'ID;ADDRESS;SETTLEMENT;YEAR BUILT;FLOORS;ENTRANCES;APARTMENTS;TOTAL AREA;MANAGEMENT COMPANY;TECHNICAL CONDITION\r\n';

    const escapeCSV = (str: string | number | null | undefined): string => {
      if (str === null || str === undefined) return '';
      const stringValue = String(str);
      const escaped = stringValue.replace(/"/g, '""');
      if (/[;"\n\r]/.test(escaped)) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const rows = items.map(item => {
      return [
        item.id,
        escapeCSV(item.address),
        escapeCSV(item.settlement),
        escapeCSV(item.yearBuilt),
        escapeCSV(item.floors),
        escapeCSV(item.entrances),
        escapeCSV(item.apartments),
        escapeCSV(item.totalArea),
        escapeCSV(item.managementCompany),
        escapeCSV(item.technicalCondition)
      ].join(';') + '\r\n';
    }).join('');

    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers + rows;

    const blob = new Blob([BOM, csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    console.log('CSV file successfully created');
    return blob;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

export const searchAddresses = async (cityId: number, searchQuery: string): Promise<{id: number, fullAddress: string}[]> => {
  try {
    console.log(`Searching addresses in city ${cityId} with query: ${searchQuery}`);
    
    const endpoint = `/addresses/${cityId}?search=${encodeURIComponent(searchQuery)}`;
    const response = await fetchAPI(endpoint);
    
    let addresses = [];
    if (Array.isArray(response)) {
      addresses = response;
    } else if (response?.data && Array.isArray(response.data)) {
      addresses = response.data;
    } else {
      console.warn('Unexpected response format when searching addresses:', response);
      return [];
    }
    
    return addresses.map((address: any) => {
      const street = address.street?.name || '';
      const houseNumber = address.house_number || '';
      const building = address.building ? `корп. ${address.building}` : '';
      const structure = address.structure ? `стр. ${address.structure}` : '';
      const literature = address.literature ? `лит. ${address.literature}` : '';
      
      const fullAddress = [
        street,
        houseNumber,
        building,
        structure,
        literature
      ].filter(Boolean).join(' ').trim();
      
      return {
        id: address.id,
        fullAddress: fullAddress || 'Address not available'
      };
    });
  } catch (error) {
    console.error(`Error searching addresses for city ${cityId}:`, error);
    return [];
  }
};

export const getAddresses = async (): Promise<{id: number, fullAddress: string}[]> => {
  try {
    const cityId = 2; // Default to Voronezh
    
    console.log(`Fetching addresses for city ID ${cityId}`);
    
    const response = await fetchAPI(`/addresses/${cityId}`);
    
    let addresses = [];
    if (Array.isArray(response)) {
      addresses = response;
    } else if (response?.data && Array.isArray(response.data)) {
      addresses = response.data;
    } else {
      console.warn('Unexpected response format when fetching addresses:', response);
      return [];
    }
    
    return addresses.map((address: any) => {
      const street = address.street?.name || '';
      const houseNumber = address.house_number || '';
      const building = address.building ? `корп. ${address.building}` : '';
      const structure = address.structure ? `стр. ${address.structure}` : '';
      const literature = address.literature ? `лит. ${address.literature}` : '';
      
      const fullAddress = [
        street,
        houseNumber,
        building,
        structure,
        literature
      ].filter(Boolean).join(' ').trim();
      
      return {
        id: address.id,
        fullAddress: fullAddress || 'Address not available'
      };
    });
  } catch (error) {
    console.error('Error getting addresses:', error);
    return [];
  }
};

export const getCities = async (): Promise<{id: number, name: string, region_id: number | null}[]> => {
  try {
    console.log('Fetching list of cities');
    const response = await fetchAPI('/cities');
    
    let cities = [];
    if (Array.isArray(response)) {
      cities = response;
    } else if (response?.data && Array.isArray(response.data)) {
      cities = response.data;
    } else {
      console.warn('Unexpected response format when fetching cities:', response);
      return [{id: 2, name: 'Воронеж', region_id: null}];
    }
    
    return cities;
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [{id: 2, name: 'Воронеж', region_id: null}];
  }
};

function adaptMultiApartmentBuildingFromApi(apiBuilding: any): MultiApartmentBuilding {
  if (!apiBuilding) {
    console.warn("adaptMultiApartmentBuildingFromApi received null or undefined input");
    return {
      id: 0,
      address: 'Data error',
      settlement: 'Data error',
      yearBuilt: 'Data error',
      floors: 'Data error',
      entrances: 'Data error',
      apartments: 'Data error',
      totalArea: 'Data error',
      managementCompany: 'Data error',
      technicalCondition: 'Data error'
    };
  }

  const id = apiBuilding.id ?? 0;

  let address = 'Not specified';
  if (apiBuilding.address?.street?.name && apiBuilding.address?.house_number) {
    address = `${apiBuilding.address.street.name}, ${apiBuilding.address.house_number}`;
    if (apiBuilding.address.building) {
      address += `, корп. ${apiBuilding.address.building}`;
    }
  }

  const settlement = apiBuilding.address?.street?.city?.name ?? 'Not specified';
  const yearBuilt = apiBuilding.buildingYear ?? 'Not specified';
  const entrances = apiBuilding.entrance_count != null ? String(apiBuilding.entrance_count) : 'Not specified';

  const floors = apiBuilding.floors ?? 'Not specified';
  const apartments = apiBuilding.apartments ?? 'Not specified';
  const totalArea = apiBuilding.totalArea ?? 'Not specified';

  const managementCompany = apiBuilding.management_org?.shortName ||
                           apiBuilding.management_org?.fullName ||
                           'Not specified';

  const technicalCondition = apiBuilding.house_condition?.houseCondition ?? 'Not specified';

  return {
    id,
    address,
    settlement,
    yearBuilt,
    floors,
    entrances,
    apartments,
    totalArea,
    managementCompany,
    technicalCondition
  };
}

function adaptMultiApartmentBuildingsFromApi(apiBuildings: any[]): MultiApartmentBuilding[] {
  if (!Array.isArray(apiBuildings)) {
      console.warn("adaptMultiApartmentBuildingsFromApi received non-array input:", apiBuildings);
      return [];
  }
  return apiBuildings.map(adaptMultiApartmentBuildingFromApi);
}

export const createMultiApartmentBuilding = async (building: ApiMultiApartmentBuildingRequest): Promise<MultiApartmentBuilding> => {
  try {
    console.log('Creating MKD:', building);
    const response = await fetchAPI('/mkd', {
      method: 'POST',
      body: JSON.stringify(building)
    });

    console.log('API response when creating MKD:', response);
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error('Error creating MKD:', error);
    throw error;
  }
};

export const updateMultiApartmentBuilding = async (id: number, building: ApiMultiApartmentBuildingRequest): Promise<MultiApartmentBuilding> => {
  try {
    console.log(`Updating MKD with ID ${id}:`, building);
    const response = await fetchAPI(`/mkd/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(building)
    });

    console.log('API response when updating MKD:', response);
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error(`Error updating MKD with ID ${id}:`, error);
    throw error;
  }
};

export const deleteMultiApartmentBuilding = async (id: number): Promise<boolean> => {
  try {
    console.log(`Deleting MKD with ID ${id}`);
    const success = await fetchAPI(`/mkd/${id}`, {
      method: 'DELETE'
    });

    console.log(`API response when deleting MKD with ID ${id}:`, success ? 'Success (204)' : 'Response with content (not 204)');
    return success === true;
  } catch (error) {
    console.error(`Error deleting MKD with ID ${id}:`, error);
    throw error;
  }
};

export const getMultiApartmentBuildingDetails = async (id: number): Promise<MultiApartmentBuilding> => {
  try {
    const response = await fetchAPI(`/mkd/${id}`);
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error(`Error getting MKD details with ID ${id}:`, error);
    throw error;
  }
};

export const getMultiApartmentBuildingRawDetails = async (id: number): Promise<any> => {
  try {
    return await fetchAPI(`/mkd/${id}`);
  } catch (error) {
    console.error(`Error getting raw MKD details with ID ${id}:`, error);
    throw error;
  }
};

export const getManagementCompanies = async (): Promise<any[]> => {
  try {
    try {
      const companies = await fetchAPI('/org');
      if (Array.isArray(companies)) return companies;
      console.warn('API /org did not return an array:', companies);
    } catch (error) {
      console.log('Failed to load /org, falling back to extract from MKD data:', error);
    }

    const allBuildingsResponse = await fetchAPI('/mkd');
    let buildings: any[] = [];
    if (Array.isArray(allBuildingsResponse)) {
        buildings = allBuildingsResponse;
    } else if (allBuildingsResponse?.data && Array.isArray(allBuildingsResponse.data)) {
        buildings = allBuildingsResponse.data;
    }

    const uniqueCompanies = new Map<number, any>();
    
    buildings.forEach(building => {
      if (building?.management_org) {
        const id = building.management_org.id;
        if (id && !uniqueCompanies.has(id)) {
          uniqueCompanies.set(id, {
            id: id,
            name: building.management_org.shortName || building.management_org.fullName,
            shortName: building.management_org.shortName,
            fullName: building.management_org.fullName
          });
        }
      }
    });
    
    return Array.from(uniqueCompanies.values());
  } catch (error) {
    console.error('Error getting management companies:', error);
    return [];
  }
};

export const getTechnicalConditions = async (): Promise<any[]> => {
  try {
    console.log('Fetching technical conditions from correct endpoint...');
    
    const conditions = await fetchAPI('/house/conditions');
    console.log('Raw response from /hs/house/conditions:', conditions);
    
    let processedConditions = [];
    
    if (Array.isArray(conditions)) {
      processedConditions = conditions;
    } else if (conditions && Array.isArray(conditions.data)) {
      processedConditions = conditions.data;
    } else if (conditions && typeof conditions === 'object') {
      processedConditions = [conditions];
    }
    
    return processedConditions.map((condition: any) => ({
      id: condition.id,
      name: condition.houseCondition || condition.name || `Condition ${condition.id}`,
      houseCondition: condition.houseCondition || condition.name || `Condition ${condition.id}`,
      actual: condition.actual,
      code: condition.code,
      createDate: condition.createDate,
      guid: condition.guid,
      lastUpdateDate: condition.lastUpdateDate,
      created_at: condition.created_at,
      updated_at: condition.updated_at
    }));
    
  } catch (error) {
    console.error('Error fetching technical conditions:', error);
    
    try {
      console.log('Trying fallback method to extract from buildings...');
      const response = await fetchAPI('/mkd');
      
      let buildings = [];
      if (Array.isArray(response)) {
        buildings = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        buildings = response.data;
      }
      
      const conditionsMap = new Map();
      buildings.forEach((building: any) => {
        if (building?.house_condition) {
          conditionsMap.set(building.house_condition.id, building.house_condition);
        }
      });
      
      return Array.from(conditionsMap.values());
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return [];
    }
  }
};

export const updateMkdSchedule = async (id: number, scheduleData: MkdScheduleUpdate): Promise<any> => {
  try {
    console.log(`Updating MKD schedule for ID ${id}:`, scheduleData);
    const response = await fetchAPI(`/mkd/${id}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(scheduleData)
    });

    console.log('API response when updating schedule:', response);
    return response;
  } catch (error) {
    console.error(`Error updating schedule for MKD with ID ${id}:`, error);
    throw error;
  }
};

export const getMkdScheduleHistory = async (id: number): Promise<MkdScheduleHistoryItem[]> => {
  try {
    console.log(`Getting schedule history for MKD ID ${id}`);
    const response = await fetchAPI(`/mkd/${id}/schedule/history`);
    
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    console.warn('Unexpected response format when getting schedule history:', response);
    return [];
  } catch (error) {
    console.error(`Error getting schedule history for MKD with ID ${id}:`, error);
    return [];
  }
};

export const getBulkMkdSchedules = async (buildingIds: number[]): Promise<any> => {
  try {
    console.log(`Getting bulk schedules for ${buildingIds.length} buildings`);
    const response = await fetchAPI('/mkd/schedules/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids: buildingIds })
    });
    
    console.log('API response for bulk schedules:', response);
    return response;
  } catch (error) {
    console.error('Error getting bulk schedules:', error);
    throw error;
  }
};

export const getHeatingSeasons = async (): Promise<HeatingSeasonInfo[]> => {
  try {
    console.log('Getting heating seasons information');
    const response = await fetchAPI('/heating-seasons');
    
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    console.warn('Unexpected response format when getting heating seasons:', response);
    return [];
  } catch (error) {
    console.error('Error getting heating seasons:', error);
    return [];
  }
};

export const updateBulkMkdSchedules = async (buildingIds: number[], scheduleData: MkdScheduleUpdate): Promise<any> => {
  try {
    console.log(`Updating schedules for ${buildingIds.length} buildings:`, scheduleData);
    const response = await fetchAPI('/mkd/schedules/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({
        building_ids: buildingIds,
        schedule: scheduleData
      })
    });
    
    console.log('API response for bulk schedule update:', response);
    return response;
  } catch (error) {
    console.error('Error updating bulk schedules:', error);
    throw error;
  }
};

export const requestExport = async (format: string): Promise<{ export_id: string, message: string }> => {
  try {
    console.log(`Requesting ${format} export...`);
    const response = await fetchAPI(`/exports/${format}`, {
      method: 'POST'
    });
    
    console.log('Export request response:', response);
    
    if (!response || !response.export_id) {
      throw new Error('Invalid response from export request');
    }
    
    return {
      export_id: response.export_id,
      message: response.message || 'Запрос на экспорт создан'
    };
  } catch (error) {
    console.error(`Error requesting ${format} export:`, error);
    throw error;
  }
};

export const checkExportStatus = async (exportId: string): Promise<{ status: string, download_url?: string }> => {
  try {
    console.log(`Checking status for export ID: ${exportId}`);
    const response = await fetchAPI(`/exports/${exportId}/status`);
    
    console.log('Export status response:', response);
    
    if (!response || !response.status) {
      throw new Error('Invalid status response');
    }
    
    return {
      status: response.status,
      download_url: response.download_url
    };
  } catch (error) {
    console.error(`Error checking export status for ID ${exportId}:`, error);
    throw error;
  }
};

export const downloadExport = async (exportId: string): Promise<Blob> => {
  try {
    console.log(`Downloading export ID: ${exportId}`);
    
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error('Отсутствует токен авторизации');
    }
    
    const response = await fetch(`${API_URL}/exports/${exportId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error(`Download failed with status: ${response.status}`);
      throw new Error(`Ошибка скачивания: ${response.status}`);
    }
    
    const contentType = response.headers.get('Content-Type');
    console.log(`Download completed. Content-Type: ${contentType}`);
    
    return await response.blob();
  } catch (error) {
    console.error(`Error downloading export ID ${exportId}:`, error);
    throw error;
  }
};