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

// Base URL for API
const API_URL = import.meta.env.VITE_API_URL;

// Authorization function - используем общую функцию из api.ts
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  // Используем функцию из api.ts и возвращаем результат
  return await loginApi(username, password);
};

// Base function for making authenticated requests
const fetchAPI = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem(TOKEN_KEY); // Используем общий ключ TOKEN_KEY

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add authorization token
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
        // Token is invalid or expired
        localStorage.removeItem(TOKEN_KEY); // Используем общий ключ TOKEN_KEY
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
      return true; // Indicate successful deletion or no content response
    }

    const data = await response.json();
    console.log('Data received:', data);
    return data;
  } catch (error) {
    console.error('Error during request execution:', error);
    throw error;
  }
};

// API initialization with authorization
export const initializeApi = async (): Promise<void> => {
  try {
    // Check token
    if (isAuthenticated()) {
      try {
        // Try a test request to verify token validity
        await fetchAPI('/mkd');
        console.log('Existing token is valid');
        return; // If request goes through, token is working
      } catch (error) {
        // Handle specific errors if needed, e.g., re-login only on 401
        console.log('Token is invalid or an error occurred');
        localStorage.removeItem(TOKEN_KEY); // Используем общий ключ TOKEN_KEY
        // Не делаем автоматическую авторизацию - пользователь должен ввести логин/пароль
        throw new Error('Authorization required');
      }
    } else {
      throw new Error('Authorization required');
    }
  } catch (error) {
    console.error('API initialization error:', error);
    throw error; // Re-throw to allow higher-level handling
  }
};

// Get list of all MKDs
export const getMultiApartmentBuildings = async (page = 1): Promise<{
  items: MultiApartmentBuilding[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    const response = await fetchAPI(`/mkd?page=${page}`);

    // Check for expected API response structure (adapt as needed)
    if (response && response.data && Array.isArray(response.data)) {
      // Standard paginated response
      return {
        items: adaptMultiApartmentBuildingsFromApi(response.data),
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      // Simple array response (no pagination info from API)
      const items = adaptMultiApartmentBuildingsFromApi(response);
      return {
        items,
        currentPage: 1,
        totalPages: 1,
        totalItems: items.length
      };
    } else {
      console.warn('Unexpected response format when getting MKD list:', response);
      // Return empty list or throw error based on requirements
      return { items: [], currentPage: 1, totalPages: 1, totalItems: 0 };
      // Or: throw new Error('Unexpected server response format');
    }
  } catch (error) {
    console.error('Error fetching buildings list:', error);
    throw error; // Re-throw to allow caller handling
  }
};

// Search for MKDs
export const searchMultiApartmentBuildings = async (query: string): Promise<MultiApartmentBuilding[]> => {
  try {
    // Attempt server-side search first
    const response = await fetchAPI(`/mkd?q=${encodeURIComponent(query)}`);

    let buildings: any[] = [];

    if (response && response.data && Array.isArray(response.data)) {
      buildings = response.data;
    } else if (Array.isArray(response)) {
      buildings = response;
    } else {
      console.warn('Unexpected response format when searching MKDs:', response);
      return []; // Return empty if response is not an array or expected structure
    }

    // If API doesn't support search or returns all items, filter client-side
    // This client-side filter might be redundant if the API search works well.
    // Consider removing if API search is reliable.
    if (query && buildings.length > 0) { // Only filter if query exists and we have buildings
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

// Export to CSV
export const exportMultiApartmentBuildingsToExcel = async (): Promise<Blob> => {
  try {
    console.log('Generating CSV file on client side');

    // Fetch all data (assuming pagination isn't massive, otherwise fetch page by page)
    // If the dataset can be very large, consider a server-side export endpoint.
    const { items } = await getMultiApartmentBuildings(1); // Adjust if pagination needed

    if (!items || items.length === 0) {
      // Create an empty CSV or throw error? Returning empty blob for now.
      console.warn('No data to export');
      return new Blob([''], { type: 'text/csv;charset=utf-8;' });
      // Or: throw new Error('No data to export');
    }

    // Use semicolon (;) for Excel compatibility in some regions
    const headers = 'ID;ADDRESS;SETTLEMENT;YEAR BUILT;FLOORS;ENTRANCES;APARTMENTS;TOTAL AREA;MANAGEMENT COMPANY;TECHNICAL CONDITION\r\n';

    const escapeCSV = (str: string | number | null | undefined): string => {
      if (str === null || str === undefined) return '';
      const stringValue = String(str);
      // Escape double quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""');
      // Enclose in double quotes if it contains semicolon, double quote, newline, or carriage return
      if (/[;"\n\r]/.test(escaped)) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const rows = items.map(item => {
      return [
        item.id, // ID is usually a number, escapeCSV handles it
        escapeCSV(item.address),
        escapeCSV(item.settlement),
        escapeCSV(item.yearBuilt),
        escapeCSV(item.floors),
        escapeCSV(item.entrances),
        escapeCSV(item.apartments),
        escapeCSV(item.totalArea),
        escapeCSV(item.managementCompany),
        escapeCSV(item.technicalCondition)
      ].join(';') + '\r\n'; // Use \r\n for Windows compatibility
    }).join('');

    // Add BOM for UTF-8 compatibility with Excel
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

// Function to search addresses by query - NEW
export const searchAddresses = async (cityId: number, searchQuery: string): Promise<{id: number, fullAddress: string}[]> => {
  try {
    console.log(`Searching addresses in city ${cityId} with query: ${searchQuery}`);
    
    const endpoint = `/addresses/${cityId}?search=${encodeURIComponent(searchQuery)}`;
    const response = await fetchAPI(endpoint);
    
    // Process response based on format
    let addresses = [];
    if (Array.isArray(response)) {
      addresses = response;
    } else if (response?.data && Array.isArray(response.data)) {
      addresses = response.data;
    } else {
      console.warn('Unexpected response format when searching addresses:', response);
      return [];
    }
    
    // Format addresses
    return addresses.map((address: any) => {
      const street = address.street?.name || '';
      const houseNumber = address.house_number || '';
      const building = address.building ? `корп. ${address.building}` : '';
      const structure = address.structure ? `стр. ${address.structure}` : '';
      const literature = address.literature ? `лит. ${address.literature}` : '';
      
      // Create full address display
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
    return []; // Return empty array on error
  }
};

// Fetch list of addresses - FIXED
export const getAddresses = async (): Promise<{id: number, fullAddress: string}[]> => {
  try {
    // Default to Voronezh (ID: 2) as it appears to be the default city in your API
    const cityId = 2;
    
    // Get streets for the city
    let streets = [];
    try {
      const streetsResponse = await fetchAPI(`/streets/${cityId}`);
      if (Array.isArray(streetsResponse)) {
        streets = streetsResponse;
      } else if (streetsResponse?.data && Array.isArray(streetsResponse.data)) {
        streets = streetsResponse.data;
      }
    } catch (error) {
      console.error('Error fetching streets:', error);
    }

    if (streets.length === 0) {
      console.warn('No streets found, returning empty addresses list');
      return [];
    }

    // Create a combined list of addresses from all streets
    let addresses: {id: number, fullAddress: string}[] = [];
    let addressId = 1;

    // Process up to 5 streets to avoid too many API calls
    const limitedStreets = streets.slice(0, 5);
    
    // Try to get addresses for each street
    for (const street of limitedStreets) {
      try {
        const streetAddresses = await fetchAPI(`/street/${street.id}/addresses`);
        
        if (Array.isArray(streetAddresses) && streetAddresses.length > 0) {
          const formattedAddresses = streetAddresses.map(addr => ({
            id: addr.id,
            fullAddress: `${street.name}, ${addr.house_number}${addr.building ? ' корп. ' + addr.building : ''}${addr.structure ? ' стр. ' + addr.structure : ''}${addr.literature ? ' лит. ' + addr.literature : ''}`
          }));
          
          addresses.push(...formattedAddresses);
        } else {
          // If no addresses found for this street, create some sample ones
          for (let houseNum = 1; houseNum <= 5; houseNum++) {
            addresses.push({
              id: addressId++,
              fullAddress: `${street.name}, ${houseNum}`
            });
          }
        }
      } catch (error) {
        console.warn(`Could not fetch addresses for street ${street.name}:`, error);
        
        // Add some dummy addresses in case of error
        for (let houseNum = 1; houseNum <= 5; houseNum++) {
          addresses.push({
            id: addressId++,
            fullAddress: `${street.name}, ${houseNum}`
          });
        }
      }
    }

    console.log(`Generated ${addresses.length} addresses`);
    return addresses;
  } catch (error) {
    console.error('Error getting addresses:', error);
    return []; // Return empty array on error
  }
};

// Function to get cities - NEW
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
      // Fallback to include at least Voronezh
      return [{id: 2, name: 'Воронеж', region_id: null}];
    }
    
    return cities;
  } catch (error) {
    console.error('Error fetching cities:', error);
    // Provide at least Voronezh as a fallback
    return [{id: 2, name: 'Воронеж', region_id: null}];
  }
};

// Data adaptation function from API to display format
function adaptMultiApartmentBuildingFromApi(apiBuilding: any): MultiApartmentBuilding {
  // Basic safety check
  if (!apiBuilding) {
    console.warn("adaptMultiApartmentBuildingFromApi received null or undefined input");
    // Return a default structure or throw an error, depending on desired behavior
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

  const id = apiBuilding.id ?? 0; // Use nullish coalescing for default

  let address = 'Not specified';
  if (apiBuilding.address?.street?.name && apiBuilding.address?.house_number) {
    address = `${apiBuilding.address.street.name}, ${apiBuilding.address.house_number}`;
    if (apiBuilding.address.building) {
      address += `, bldg. ${apiBuilding.address.building}`;
    }
  }

  const settlement = apiBuilding.address?.street?.city?.name ?? 'Not specified';
  const yearBuilt = apiBuilding.buildingYear ?? 'Not specified';
  const entrances = apiBuilding.entrance_count != null ? String(apiBuilding.entrance_count) : 'Not specified';

  // Custom fields that might be added to the API
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

// Function to create a new MKD
export const createMultiApartmentBuilding = async (building: ApiMultiApartmentBuildingRequest): Promise<MultiApartmentBuilding> => {
  try {
    console.log('Creating MKD:', building);
    const response = await fetchAPI('/mkd', {
      method: 'POST',
      body: JSON.stringify(building)
    });

    console.log('API response when creating MKD:', response);
    // Assuming the API returns the created object in the same format as GET /mkd/{id}
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error('Error creating MKD:', error);
    throw error;
  }
};

// Function to update MKD
export const updateMultiApartmentBuilding = async (id: number, building: ApiMultiApartmentBuildingRequest): Promise<MultiApartmentBuilding> => {
  try {
    console.log(`Updating MKD with ID ${id}:`, building);
    const response = await fetchAPI(`/mkd/${id}`, {
      method: 'PATCH', // Or PUT if the API expects full replacement
      body: JSON.stringify(building)
    });

    console.log('API response when updating MKD:', response);
    // Assuming the API returns the updated object
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error(`Error updating MKD with ID ${id}:`, error);
    throw error;
  }
};

// Function to delete MKD
export const deleteMultiApartmentBuilding = async (id: number): Promise<boolean> => {
  try {
    console.log(`Deleting MKD with ID ${id}`);
    // fetchAPI returns true for 204 No Content
    const success = await fetchAPI(`/mkd/${id}`, {
      method: 'DELETE'
    });

    console.log(`API response when deleting MKD with ID ${id}:`, success ? 'Success (204)' : 'Response with content (not 204)');
    return success === true; // Ensure we return a boolean based on 204 response
  } catch (error) {
    console.error(`Error deleting MKD with ID ${id}:`, error);
    throw error; // Re-throw error for handling in UI
  }
};

// Function to get MKD details for display (adapted)
export const getMultiApartmentBuildingDetails = async (id: number): Promise<MultiApartmentBuilding> => {
  try {
    const response = await fetchAPI(`/mkd/${id}`);
    return adaptMultiApartmentBuildingFromApi(response);
  } catch (error) {
    console.error(`Error getting MKD details with ID ${id}:`, error);
    throw error;
  }
};

// Function to get raw MKD details for editing (without adaptation)
export const getMultiApartmentBuildingRawDetails = async (id: number): Promise<any> => {
  try {
    // Returns the raw data exactly as received from the API
    return await fetchAPI(`/mkd/${id}`);
  } catch (error) {
    console.error(`Error getting raw MKD details with ID ${id}:`, error);
    throw error;
  }
};

// --- Functions for working with reference books ---

// Get list of management companies
export const getManagementCompanies = async (): Promise<any[]> => {
  try {
    // Try dedicated endpoint first
    try {
      const companies = await fetchAPI('/org');
      // Assume API returns array of { id: number, name: string, ... }
      if (Array.isArray(companies)) return companies;
      console.warn('API /org did not return an array:', companies);
    } catch (error) {
      // Log error but continue to fallback if endpoint doesn't exist or fails
      console.log('Failed to load /org, falling back to extract from MKD data:', error);
    }

    // Fallback: Extract from all buildings
    const allBuildingsResponse = await fetchAPI('/mkd'); // Fetch all buildings (consider pagination if large)
    let buildings: any[] = [];
    if (Array.isArray(allBuildingsResponse)) {
        buildings = allBuildingsResponse;
    } else if (allBuildingsResponse?.data && Array.isArray(allBuildingsResponse.data)) {
        buildings = allBuildingsResponse.data;
    }

    // Extract unique companies
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
    return []; // Return empty array on error
  }
};

// Get list of technical conditions - precise extraction from API
// Get technical conditions using the correct endpoint
export const getTechnicalConditions = async (): Promise<any[]> => {
  try {
    console.log('Fetching technical conditions from correct endpoint...');
    
    // Use the exact endpoint shown in Postman
    const conditions = await fetchAPI('/hs/house/conditions');
    console.log('Raw response from /hs/house/conditions:', conditions);
    
    // Handle different possible response formats
    let processedConditions = [];
    
    if (Array.isArray(conditions)) {
      processedConditions = conditions;
    } else if (conditions && Array.isArray(conditions.data)) {
      processedConditions = conditions.data;
    } else if (conditions && typeof conditions === 'object') {
      // If it's a single object (not wrapped in array)
      processedConditions = [conditions];
    }
    
    // Ensure each condition has consistent property names
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
    
    // Try fallback to original approach if the specific endpoint fails
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

// ----- MKD Schedule Functions -----

// Function to update MKD schedule
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

// Function to get schedule history for a building
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

// Function to get bulk schedules for several buildings
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

// Function to get heating seasons information
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

// Function to apply bulk schedule update to multiple buildings
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