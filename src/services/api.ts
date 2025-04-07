import { HeatSource, ApiHeatSource, AuthResponse } from '../types/heatSource';
import { HeatingPeriod, HeatingPeriodApiResponse } from '../types/heatingPeriod';
import { Incident, IncidentType, ResourceType } from '../types/incident';
import { City, Street, Address } from '../types/incident';

// Базовый URL для API
const API_URL = import.meta.env.VITE_API_URL;

// Имя ключа для хранения токена в localStorage
export const TOKEN_KEY = 'token';

// Функция для авторизации с пользовательскими данными
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('Выполняется авторизация...');
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        "login": username,
        "password": password
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Ошибка авторизации: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    console.log('Результат авторизации:', data);
    
    if (!data.token) {
      throw new Error('Токен не получен в ответе');
    }
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    throw error;
  }
};

// Функция для выхода из системы
export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
  // Можно добавить запрос на инвалидацию токена на сервере, если API поддерживает
};

// Функция для проверки авторизации пользователя
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
};

// Функция для получения токена
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Базовая функция для выполнения запросов с авторизацией
const fetchAPI = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getToken();
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Добавляем токен авторизации
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    throw new Error('Отсутствует токен авторизации');
  }
  
  try {
    console.log(`Выполняется запрос: ${API_URL}${endpoint}`);
    if (options.body) {
      console.log('Отправляемые данные:', JSON.parse(options.body as string));
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      console.error(`Ошибка запроса: ${response.status}`, endpoint);
      
      if (response.status === 401) {
        // Токен недействителен или истек
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Необходима повторная авторизация');
      }
      
      try {
        const errorData = await response.json();
        console.error('Детали ошибки:', errorData);
        
        // Формируем удобное для пользователя сообщение об ошибке
        let errorMessage = '';
        
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // Добавляем детали ошибок по полям, если они есть
        if (errorData.errors) {
          const errorDetails = [];
          for (const field in errorData.errors) {
            if (Array.isArray(errorData.errors[field])) {
              errorData.errors[field].forEach((msg: string) => {
                errorDetails.push(msg);
              });
            } else {
              errorDetails.push(`${field}: ${errorData.errors[field]}`);
            }
          }
          
          if (errorDetails.length > 0) {
            errorMessage = errorDetails.join('\n');
          }
        }
        
        // Если не удалось сформировать сообщение, используем стандартное
        if (!errorMessage) {
          errorMessage = `Ошибка запроса: ${response.status}`;
        }
        
        // Создаем более информативную ошибку
        const error = new Error(errorMessage);
        // @ts-ignore - добавляем данные ответа к объекту ошибки
        error.response = { status: response.status, data: errorData };
        throw error;
      } catch (e) {
        if (e instanceof Error && e.message) {
          throw e; // Если уже обработали ошибку, пробрасываем ее дальше
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
    }

    if (response.status === 204) {
      return true;
    }

    const data = await response.json();
    console.log('Получены данные:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    throw error;
  }
};

// Инициализация API с авторизацией
export const initializeApi = async (): Promise<void> => {
  try {
    // Проверяем токен
    const token = getToken();
    if (token) {
      try {
        // Пробуем сделать тестовый запрос для проверки валидности токена
        await fetchAPI('/hs-type');
        console.log('Существующий токен действителен');
        return; // Если запрос прошел, значит токен рабочий
      } catch (error) {
        console.log('Токен недействителен');
        localStorage.removeItem(TOKEN_KEY);
        // Не делаем автоматическую авторизацию - пользователь должен ввести логин/пароль
        throw new Error('Требуется авторизация');
      }
    } else {
      throw new Error('Требуется авторизация');
    }
  } catch (error) {
    console.error('Ошибка инициализации API:', error);
    throw error;
  }
};

// Общие методы API для многократного использования
export const api = {
  get: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    return await fetchAPI(url, { ...options, method: 'GET' });
  },
  
  post: async <T>(url: string, data: any, options: RequestInit = {}): Promise<T> => {
    return await fetchAPI(url, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put: async <T>(url: string, data: any, options: RequestInit = {}): Promise<T> => {
    return await fetchAPI(url, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  patch: async <T>(url: string, data: any, options: RequestInit = {}): Promise<T> => {
    return await fetchAPI(url, { 
      ...options, 
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  delete: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    return await fetchAPI(url, { ...options, method: 'DELETE' });
  }
};

// Получение списка всех теплоисточников
export const getHeatSources = async (page = 1): Promise<{
  items: HeatSource[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    const response = await fetchAPI(`/hs?page=${page}`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: adaptHeatSourcesFromApi(response.data),
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      // Если ответ просто массив
      return {
        items: adaptHeatSourcesFromApi(response),
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    } else {
      // Если формат ответа неизвестен
      console.warn('Неожиданный формат ответа:', response);
      throw new Error('Неожиданный формат ответа от сервера');
    }
  } catch (error) {
    console.error('Ошибка получения списка теплоисточников:', error);
    throw error;
  }
};

// Поиск теплоисточников
export const searchHeatSources = async (query: string): Promise<HeatSource[]> => {
  try {
    const response = await fetchAPI(`/hs?name=${encodeURIComponent(query)}`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return adaptHeatSourcesFromApi(response.data);
    } else if (Array.isArray(response)) {
      return adaptHeatSourcesFromApi(response);
    }
    
    return [];
  } catch (error) {
    console.error('Ошибка поиска:', error);
    throw error;
  }
};

// Фильтрация теплоисточников по населенному пункту
export const filterHeatSourcesBySettlement = async (settlement: string): Promise<HeatSource[]> => {
  try {
    // Get all data and filter on address field instead
    const response = await fetchAPI(`/hs`);
    
    let items: HeatSource[] = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      items = adaptHeatSourcesFromApi(response.data);
    } else if (Array.isArray(response)) {
      items = adaptHeatSourcesFromApi(response);
    }
    
    // If 'all' selected, return all items
    if (settlement === 'all') {
      return items;
    }
    
    // Filter based on address instead of settlement
    return items.filter(item => 
      item.address.toLowerCase().includes(settlement.toLowerCase())
    );
  } catch (error) {
    console.error('Ошибка фильтрации:', error);
    throw error;
  }
};

// Экспорт в CSV (так как Excel не работает через API)
// Экспорт в CSV (оптимизированный для корректного открытия в русском Excel)
export const exportHeatSourcesToExcel = async (): Promise<Blob> => {
  try {
    console.log('Генерация CSV-файла на стороне клиента');
    
    // Получаем текущие данные
    const data = await getHeatSources(1);
    
    if (!data || !data.items || data.items.length === 0) {
      throw new Error('Нет данных для экспорта');
    }
    
    // Используем точку с запятой (;) вместо запятой как разделитель для корректного открытия в русском Excel
    const headers = 'ID;НАИМЕНОВАНИЕ ИСТОЧНИКА;АДРЕС;ТИП;УСТАНОВЛЕННАЯ МОЩНОСТЬ;ДОСТУПНАЯ МОЩНОСТЬ;ОСНОВНОЙ ВИД ТОПЛИВА;ВТОРИЧНЫЙ ВИД ТОПЛИВА;ТЕМПЕРАТУРНЫЙ ГРАФИК;СОБСТВЕННИК;ЭКСП. ОРГАНИЗАЦИЯ;ПЕРИОД РАБОТЫ;ГОД ВВОДА;ДАТА НАЧАЛА ПЕРЕДАЧИ ДАННЫХ;ПОТРЕБИТЕЛИ\r\n';
    
    const rows = data.items.map(item => {
      // Функция для экранирования строк с кавычками
      const escapeCSV = (str: string | number | null | undefined): string => {
        if (str === null || str === undefined) return '';
        // Заменяем двойные кавычки на двойные двойные кавычки (стандарт CSV)
        const escaped = String(str).replace(/"/g, '""');
        // Заключаем в кавычки, если строка содержит точку с запятой, кавычки или переносы строк
        return /[;"'\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
      };
      
      // Формируем строку с экранированными значениями, разделенными точкой с запятой
      return [
        item.id,
        escapeCSV(item.sourceName),
        escapeCSV(item.address),
        escapeCSV(item.type),
        escapeCSV(item.installed_capacity_gcal_hour),
        escapeCSV(item.available_capacity_gcal_hour),
        escapeCSV(item.primary_fuel_type),
        escapeCSV(item.secondary_fuel_type),
        escapeCSV(item.temperature_schedule),
        escapeCSV(item.owner),
        escapeCSV(item.operator),
        escapeCSV(item.operationPeriod),
        escapeCSV(item.yearBuilt),
        escapeCSV(item.data_transmission_start_date),
        escapeCSV(item.consumers)
      ].join(';') + '\r\n';
    }).join('');
    
    // Добавляем BOM для правильной кодировки UTF-8
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers + rows;
    
    // Создаем Blob с правильным типом и названием
    const blob = new Blob([BOM, csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    console.log('CSV-файл успешно создан');
    return blob;
  } catch (error) {
    console.error('Ошибка экспорта в CSV:', error);
    throw error;
  }
};

// Функции адаптеров для преобразования данных
// Add these changes to the adaptHeatSourceFromApi function in api.ts
function adaptHeatSourceFromApi(apiSource: ApiHeatSource): HeatSource {
  console.log('Данные для адаптации:', apiSource);
  
  const ownerName = apiSource.owner 
    ? (typeof apiSource.owner === 'object' && apiSource.owner !== null && 'shortName' in apiSource.owner 
        ? apiSource.owner.shortName 
        : (typeof apiSource.owner === 'string' ? apiSource.owner : ''))
    : '';
    
  const operatorName = apiSource.org 
    ? (typeof apiSource.org === 'object' && apiSource.org !== null && 'shortName' in apiSource.org 
        ? apiSource.org.shortName 
        : (typeof apiSource.org === 'string' ? apiSource.org : ''))
    : '';
  
  return {
    id: apiSource.id || 0,
    owner: (ownerName && typeof ownerName === 'string') ? ownerName : 'Не указано',
    operator: (operatorName && typeof operatorName === 'string') ? operatorName : 'Не указано',
    sourceName: apiSource.name || 'Не указано',
    installed_capacity_gcal_hour: apiSource.installed_capacity_gcal_hour || 'Не указано',
    available_capacity_gcal_hour: apiSource.available_capacity_gcal_hour || 'Не указано',
    address: (apiSource.oks?.address?.name || 
             (typeof apiSource.address === 'string' ? apiSource.address : 
              (apiSource.address && typeof apiSource.address === 'object' && 'name' in apiSource.address ? apiSource.address.name : ''))) || 'Не указано',
    type: apiSource.type && typeof apiSource.type === 'object' && 'name' in apiSource.type ? apiSource.type.name : 
          (typeof apiSource.type === 'string' ? apiSource.type : 'Не указано'),
    primary_fuel_type: apiSource.primary_fuel_type || 'Не указано',
    secondary_fuel_type: apiSource.secondary_fuel_type || 'Не указано',
    temperature_schedule: apiSource.temperature_schedule || 'Не указано',
    operationPeriod: apiSource.period && typeof apiSource.period === 'object' && 'name' in apiSource.period ? apiSource.period.name : 
                     (apiSource.operationPeriod || 'Не указано'),
    yearBuilt: apiSource.yearBuilt || 
               (apiSource.year) || 
               'Не указано',
    data_transmission_start_date: apiSource.data_transmission_start_date || 'Не указано',
    consumers: apiSource.consumers || 'Не указано',
  };
}

function adaptHeatSourcesFromApi(apiSources: ApiHeatSource[]): HeatSource[] {
  return apiSources.map(adaptHeatSourceFromApi);
}

// Функция для создания нового теплоисточника
export const createHeatSource = async (heatSource: Partial<ApiHeatSource>): Promise<HeatSource> => {
  try {
    console.log('Отправляемые данные:', heatSource);
    
    if (!heatSource.address_id) {
      heatSource.address_id = 1;
    }
    
    if (!heatSource.supply_address_ids) {
      heatSource.supply_address_ids = [];
    }
    
    const response = await fetchAPI('/hs', {
      method: 'POST',
      body: JSON.stringify(heatSource)
    });
    
    console.log('Ответ сервера:', response);
    return adaptHeatSourceFromApi(response);
  } catch (error) {
    console.error('Ошибка создания теплоисточника:', error);
    throw error;
  }
};

// Функция для обновления теплоисточника
export const updateHeatSource = async (id: number, heatSource: Partial<ApiHeatSource>): Promise<HeatSource> => {
  try {
    console.log(`Обновление теплоисточника ID=${id}:`, heatSource);
    
    if (!heatSource.address_id && heatSource.address_id !== 0) {
      heatSource.address_id = 1;
    }
    
    if (!heatSource.supply_address_ids) {
      heatSource.supply_address_ids = [];
    }
    
    const response = await fetchAPI(`/hs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(heatSource)
    });
    
    console.log('Ответ сервера при обновлении:', response);
    return adaptHeatSourceFromApi(response);
  } catch (error) {
    console.error('Ошибка обновления теплоисточника:', error);
    throw error;
  }
};

// Функция для удаления теплоисточника
export const deleteHeatSource = async (id: number): Promise<boolean> => {
  try {
    await fetchAPI(`/hs/${id}`, {
      method: 'DELETE'
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка удаления теплоисточника:', error);
    throw error;
  }
};

// Функция для получения деталей теплоисточника
export const getHeatSourceDetails = async (id: number): Promise<HeatSource> => {
  try {
    const response = await fetchAPI(`/hs/${id}`);
    return adaptHeatSourceFromApi(response);
  } catch (error) {
    console.error('Ошибка получения деталей теплоисточника:', error);
    throw error;
  }
};

// Функции для работы с типами теплоисточников
export const getHeatSourceTypes = async (): Promise<any[]> => {
  try {
    return await fetchAPI('/hs-type');
  } catch (error) {
    console.error('Ошибка получения типов теплоисточников:', error);
    throw error;
  }
};

// Функции для работы с организациями
export const getOrganizations = async (): Promise<any[]> => {
  try {
    return await fetchAPI('/org');
  } catch (error) {
    console.error('Ошибка получения организаций:', error);
    throw error;
  }
};

// Функции для работы с периодами
export const getHeatSourcePeriods = async (): Promise<any[]> => {
  try {
    return await fetchAPI('/hs-period');
  } catch (error) {
    console.error('Ошибка получения периодов работы:', error);
    throw error;
  }
};

// Функции для работы с ОКС
export const getOKS = async (): Promise<any[]> => {
  try {
    const response = await fetchAPI('/oks');
    
    // Проверяем, что ответ является массивом
    if (Array.isArray(response)) {
      return response;
    } 
    // Проверяем, есть ли данные в формате пагинации
    else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Если формат ответа неожиданный, возвращаем пустой массив
    console.warn('Неожиданный формат ответа от API ОКС:', response);
    return [];
  } catch (error) {
    console.error('Ошибка получения ОКС:', error);
    // Возвращаем пустой массив вместо исключения
    return [];
  }
};

// Типы данных
export interface UserRole {
  id: number;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  login: string;
  phone: string;
  org_id?: number;
  created_at?: string;
  updated_at?: string;
  roles?: UserRole[];
}

export interface UserCreateData {
  first_name: string;
  last_name: string;
  middle_name: string;
  login: string;
  phone: string;
  password: string;
  password_confirmation: string;
  org_id?: number;
  role_ids: number[];
}

export interface UserUpdateData {
  first_name: string;
  last_name: string;
  middle_name: string;
  login: string;
  phone: string;
  password?: string;
  password_confirmation?: string;
  org_id?: number;
  role_ids: number[];
}

// Получение списка всех пользователей
export const getUsers = async (): Promise<UserData[]> => {
  try {
    return await api.get<UserData[]>('/users');
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
    throw error;
  }
};

// Получение пользователя по ID
export const getUserById = async (id: number): Promise<UserData> => {
  try {
    return await api.get<UserData>(`/users/${id}`);
  } catch (error) {
    console.error(`Ошибка получения пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Создание нового пользователя
export const createUser = async (userData: UserCreateData): Promise<UserData> => {
  try {
    return await api.post<UserData>('/users', userData);
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    throw error;
  }
};

// Обновление пользователя
export const updateUser = async (id: number, userData: UserUpdateData): Promise<UserData> => {
  try {
    return await api.put<UserData>(`/users/${id}`, userData);
  } catch (error) {
    console.error(`Ошибка обновления пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Удаление пользователя
// Удаление пользователя
export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    // Передаем пустой объект в качестве второго аргумента
    await api.delete(`/users/${id}`, {});
    return true;
  } catch (error) {
    console.error(`Ошибка удаления пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Получение списка всех ролей
export const getRoles = async (): Promise<UserRole[]> => {
  try {
    return await api.get<UserRole[]>('/roles');
  } catch (error) {
    console.error('Ошибка получения списка ролей:', error);
    throw error;
  }
};

// Fixed code
export const checkUserPermission = async (permissionSlug: string): Promise<boolean> => {
  try {
    const response = await api.post<{access: boolean}>(`/permissions/${permissionSlug}`, {});
    return response.access;
  } catch (error) {
    console.error(`Ошибка проверки доступа ${permissionSlug}:`, error);
    return false;
  }
};

// Получение всех разрешений
export const getAllPermissions = async (): Promise<Record<string, string>> => {
  try {
    return await api.get<Record<string, string>>('/permissions');
  } catch (error) {
    console.error('Ошибка получения списка разрешений:', error);
    throw error;
  }
};

// Add these interface definitions to your types section

// Role interfaces
export interface Role {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface RoleCreateData {
  name: string;
  permissions: string[]; // Array of permission slugs
}

export interface RoleUpdateData {
  name: string;
  permissions: string[]; // Array of permission slugs
}

// Permission interface
export interface Permission {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  pivot?: {
    role_id: number;
    permission_id: number;
  };
}

// Settings User interfaces
export interface SettingsUser {
  id: number;
  created_at: string;
  updated_at: string;
  org_id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  login: string;
  roles: Role[];
  permissions?: Permission[];
  org?: Organization;
  email: string | null;
  telegram: string | null;
  vk: string | null;
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

export interface SettingsUserCreateData {
  org_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  login: string;
  password: string;
  password_confirm?: string; // Добавьте это поле, если его нет
  permissions?: string[]; // Array of permission slugs
  roles?: string[]; // Array of role slugs
}

export interface SettingsUserUpdateData {
  org_id?: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  login?: string;
  password?: string;
  password_confirmation?: string;
  permissions?: string[]; // Array of permission slugs
  roles?: string[]; // Array of role slugs
}

// Role management functions

// Get list of all roles
export const getRolesList = async (): Promise<Role[]> => {
  try {
    return await api.get<Role[]>('/settings/role');
  } catch (error) {
    console.error('Ошибка получения списка ролей:', error);
    throw error;
  }
};

// Get role details by ID
export const getRoleDetails = async (id: number): Promise<Role> => {
  try {
    return await api.get<Role>(`/settings/role/${id}`);
  } catch (error) {
    console.error(`Ошибка получения роли с ID ${id}:`, error);
    throw error;
  }
};

// Create a new role
export const createRole = async (roleData: RoleCreateData): Promise<Role> => {
  try {
    return await api.post<Role>('/settings/role', roleData);
  } catch (error) {
    console.error('Ошибка создания роли:', error);
    throw error;
  }
};

// Update a role
export const updateRole = async (id: number, roleData: RoleUpdateData): Promise<Role> => {
  try {
    return await api.patch<Role>(`/settings/role/${id}`, roleData);
  } catch (error) {
    console.error(`Ошибка обновления роли с ID ${id}:`, error);
    throw error;
  }
};

// Delete a role
export const deleteRole = async (id: number): Promise<boolean> => {
  try {
    const result = await api.delete<{message: boolean}>(`/settings/role/${id}`);
    return result.message;
  } catch (error) {
    console.error(`Ошибка удаления роли с ID ${id}:`, error);
    throw error;
  }
};

// Permission management functions

// Get list of all permissions
export const getPermissionsList = async (): Promise<Permission[]> => {
  try {
    return await api.get<Permission[]>('/settings/permission');
  } catch (error) {
    console.error('Ошибка получения списка доступов:', error);
    throw error;
  }
};

// User management functions for /settings/user endpoints

// Get list of all users from settings
export const getSettingsUsersList = async (search?: string, roleId?: number): Promise<SettingsUser[]> => {
  try {
    let queryParams = [];
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (roleId) queryParams.push(`role_id=${roleId}`);
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return await api.get<SettingsUser[]>(`/settings/user${queryString}`);
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
    throw error;
  }
};

// Get user details by ID from settings
export const getSettingsUserDetails = async (id: number): Promise<SettingsUser> => {
  try {
    return await api.get<SettingsUser>(`/settings/user/${id}`);
  } catch (error) {
    console.error(`Ошибка получения пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Create a new user in settings
export const createSettingsUser = async (userData: SettingsUserCreateData): Promise<SettingsUser> => {
  try {
    console.log('createSettingsUser: Отправляемые данные:', userData);
    return await api.post<SettingsUser>('/settings/user', userData);
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    throw error;
  }
};

// Update a user in settings
export const updateSettingsUser = async (id: number, userData: SettingsUserUpdateData): Promise<SettingsUser> => {
  try {
    return await api.patch<SettingsUser>(`/settings/user/${id}`, userData);
  } catch (error) {
    console.error(`Ошибка обновления пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Delete a user in settings
export const deleteSettingsUser = async (id: number): Promise<boolean> => {
  try {
    const result = await api.delete<{message: boolean}>(`/settings/user/${id}`);
    return result.message;
  } catch (error) {
    console.error(`Ошибка удаления пользователя с ID ${id}:`, error);
    throw error;
  }
};

// Получение списка отопительных периодов
export const getHeatingPeriods = async (page = 1): Promise<HeatingPeriodApiResponse> => {
  try {
    const response = await fetchAPI(`/heating-periods?page=${page}`);
    
    if (Array.isArray(response)) {
      return {
        items: response,
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    } else if (response && response.data && Array.isArray(response.data)) {
      return {
        items: response.data,
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else {
      console.warn('Неожиданный формат ответа:', response);
      throw new Error('Неожиданный формат ответа от сервера');
    }
  } catch (error) {
    console.error('Ошибка получения списка отопительных периодов:', error);
    throw error;
  }
};

// Фильтрация отопительных периодов
export const filterHeatingPeriods = async (
  city_id?: number, 
  street_id?: number, 
  house_number?: string
): Promise<HeatingPeriod[]> => {
  try {
    let queryParams = '';
    if (city_id) queryParams += `&city_id=${city_id}`;
    if (street_id) queryParams += `&street_id=${street_id}`;
    if (house_number) queryParams += `&house_number=${encodeURIComponent(house_number)}`;
    
    const endpoint = queryParams 
      ? `/heating-periods?${queryParams.substring(1)}` 
      : '/heating-periods';
    
    const response = await fetchAPI(endpoint);
    
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    throw error;
  }
};

// Экспорт в CSV
export const exportHeatingPeriodsToExcel = async (): Promise<Blob> => {
  try {
    console.log('Генерация CSV-файла на стороне клиента');
    
    // Получаем текущие данные
    const data = await getHeatingPeriods(1);
    
    if (!data || !data.items || data.items.length === 0) {
      throw new Error('Нет данных для экспорта');
    }
    
    // Используем точку с запятой (;) вместо запятой как разделитель для корректного открытия в русском Excel
    const headers = 'ID;ГОРОД;УЛИЦА;НОМЕР ДОМА;ПЛАН. ДАТА ОТКЛЮЧЕНИЯ;ФАКТ. ДАТА ОТКЛЮЧЕНИЯ;ПЛАН. ДАТА ВКЛЮЧЕНИЯ;ФАКТ. ДАТА ВКЛЮЧЕНИЯ;ПРИКАЗ ОБ ОТКЛЮЧЕНИИ;ПРИКАЗ О ВКЛЮЧЕНИИ\r\n';
    
    const rows = data.items.map(item => {
      // Функция для экранирования строк с кавычками
      const escapeCSV = (str: string | number | null | undefined): string => {
        if (str === null || str === undefined) return '';
        // Заменяем двойные кавычки на двойные двойные кавычки (стандарт CSV)
        const escaped = String(str).replace(/"/g, '""');
        // Заключаем в кавычки, если строка содержит точку с запятой, кавычки или переносы строк
        return /[;"'\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
      };
      
      // Формируем строку с экранированными значениями, разделенными точкой с запятой
      return [
        item.id,
        escapeCSV(item.address.city),
        escapeCSV(item.address.street),
        escapeCSV(item.address.house_number),
        escapeCSV(item.planned_disconnection_date),
        escapeCSV(item.actual_disconnection_date),
        escapeCSV(item.planned_connection_date),
        escapeCSV(item.actual_connection_date),
        escapeCSV(item.disconnection_order || ''),
        escapeCSV(item.connection_order || '')
      ].join(';') + '\r\n';
    }).join('');
    
    // Добавляем BOM для правильной кодировки UTF-8
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers + rows;
    
    // Создаем Blob с правильным типом и названием
    const blob = new Blob([BOM, csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    console.log('CSV-файл успешно создан');
    return blob;
  } catch (error) {
    console.error('Ошибка экспорта в CSV:', error);
    throw error;
  }
};

// Функции для работы с МКД - Добавьте в конец файла api.ts

import { MkdBuilding, MkdQueryParams } from '../types/mkdSchedule';

// Получение списка всех МКД с пагинацией
export const getMkdBuildings = async (page = 1, queryParams: MkdQueryParams = {}): Promise<{
  items: MkdBuilding[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    let queryString = `page=${page}`;
    
    // Добавляем дополнительные параметры запроса, если они указаны
    if (queryParams.city_id) queryString += `&city_id=${queryParams.city_id}`;
    if (queryParams.street_id) queryString += `&street_id=${queryParams.street_id}`;
    if (queryParams.address_id) queryString += `&address_id=${queryParams.address_id}`;
    if (queryParams.buildingYear) queryString += `&buildingYear=${queryParams.buildingYear}`;
    if (queryParams.municipality_org_id) queryString += `&municipality_org_id=${queryParams.municipality_org_id}`;
    if (queryParams.management_org_id) queryString += `&management_org_id=${queryParams.management_org_id}`;
    
    const response = await fetchAPI(`/mkd?${queryString}`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: response.data,
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      // Если ответ просто массив
      return {
        items: response,
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    } else {
      // Если формат ответа неизвестен
      console.warn('Неожиданный формат ответа:', response);
      throw new Error('Неожиданный формат ответа от сервера');
    }
  } catch (error) {
    console.error('Ошибка получения списка МКД:', error);
    throw error;
  }
};

// Получение отдельного МКД по ID
export const getMkdBuilding = async (id: number): Promise<MkdBuilding> => {
  try {
    return await fetchAPI(`/mkd/${id}`);
  } catch (error) {
    console.error(`Ошибка получения МКД с ID ${id}:`, error);
    throw error;
  }
};

// Фильтрация МКД по параметрам
// In api.ts
export const filterMkdBuildings = async (params: MkdQueryParams): Promise<MkdBuilding[]> => {
  try {
    let queryParams = '';
    
    if (params.region_id) queryParams += `&region_id=${params.region_id}`;
    if (params.city_id) queryParams += `&city_id=${params.city_id}`;
    if (params.street_id) queryParams += `&street_id=${params.street_id}`;
    if (params.address_id) queryParams += `&address_id=${params.address_id}`;
    if (params.buildingYear) queryParams += `&buildingYear=${params.buildingYear}`;
    if (params.municipality_org_id) queryParams += `&municipality_org_id=${params.municipality_org_id}`;
    if (params.management_org_id) queryParams += `&management_org_id=${params.management_org_id}`;
    
    const endpoint = queryParams 
      ? `/mkd?${queryParams.substring(1)}` 
      : '/mkd';
    
    const response = await fetchAPI(endpoint);
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  } catch (error) {
    console.error('Ошибка фильтрации МКД:', error);
    throw error;
  }
};

// Получение списка городов
export const getCities = async (): Promise<City[]> => {
  try {
    return await fetchAPI('/cities');
  } catch (error) {
    console.error('Ошибка получения списка городов:', error);
    throw error;
  }
};

export const getStreets = async (cityId?: number): Promise<Street[]> => {
  try {
    // Using path parameter format from Postman export
    // /streets/{cityId} instead of /streets?city_id={cityId}
    const endpoint = cityId ? `/streets/${cityId}` : '/streets/2'; // Default to Воронеж (ID: 2) if no city specified
    const response = await fetchAPI(endpoint);
    
    // Handle paginated response format
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  } catch (error) {
    console.error('Ошибка получения списка улиц:', error);
    throw error;
  }
};

// Создание нового МКД с графиком включения/отключения
export const createMkdWithSchedule = async (mkdData: Partial<MkdBuilding>): Promise<MkdBuilding> => {
  try {
    return await fetchAPI('/mkd', {
      method: 'POST',
      body: JSON.stringify(mkdData)
    });
  } catch (error) {
    console.error('Ошибка создания МКД:', error);
    throw error;
  }
};

// Обновление МКД с графиком включения/отключения
export const updateMkdWithSchedule = async (id: number, mkdData: Partial<MkdBuilding>): Promise<MkdBuilding> => {
  try {
    return await fetchAPI(`/mkd/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(mkdData)
    });
  } catch (error) {
    console.error(`Ошибка обновления МКД с ID ${id}:`, error);
    throw error;
  }
};

// Удаление МКД
export const deleteMkd = async (id: number): Promise<boolean> => {
  try {
    const response = await fetchAPI(`/mkd/${id}`, {
      method: 'DELETE'
    });
    return response.message === true;
  } catch (error) {
    console.error(`Ошибка удаления МКД с ID ${id}:`, error);
    throw error;
  }
};

// Экспорт в CSV (оптимизированный для корректного открытия в русском Excel)
export const exportMkdToExcel = async (data: MkdBuilding[]): Promise<Blob> => {
  try {
    console.log('Генерация CSV-файла на стороне клиента');
    
    if (!data || data.length === 0) {
      throw new Error('Нет данных для экспорта');
    }
    
    // Используем точку с запятой (;) вместо запятой как разделитель для корректного открытия в русском Excel
    const headers = 'ID;АДРЕС;НОМЕР ДОМА;ГОРОД;ГОД ПОСТРОЙКИ;КАДАСТРОВЫЙ НОМЕР;ТИП ДОМА;СОСТОЯНИЕ ДОМА;УК;ПЛАН. ДАТА ОТКЛЮЧЕНИЯ;ФАКТ. ДАТА ОТКЛЮЧЕНИЯ;ПЛАН. ДАТА ВКЛЮЧЕНИЯ;ФАКТ. ДАТА ВКЛЮЧЕНИЯ;ПРИКАЗ ОБ ОТКЛЮЧЕНИИ;ПРИКАЗ О ВКЛЮЧЕНИИ\r\n';
    
    const rows = data.map(item => {
      // Функция для экранирования строк с кавычками
      const escapeCSV = (str: string | number | null | undefined): string => {
        if (str === null || str === undefined) return '';
        // Заменяем двойные кавычки на двойные двойные кавычки (стандарт CSV)
        const escaped = String(str).replace(/"/g, '""');
        // Заключаем в кавычки, если строка содержит точку с запятой, кавычки или переносы строк
        return /[;"'\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
      };
      
      // Формируем строку с экранированными значениями, разделенными точкой с запятой
      return [
        item.id,
        escapeCSV(item.address.street.name),
        escapeCSV(item.address.house_number + (item.address.building ? ` корп. ${item.address.building}` : '')),
        escapeCSV(item.address.street.city.name),
        escapeCSV(item.buildingYear),
        escapeCSV(item.cadastreNumber),
        escapeCSV(item.house_type.houseTypeName),
        escapeCSV(item.house_condition.houseCondition),
        escapeCSV(item.management_org.shortName),
        escapeCSV(item.planned_disconnection_date || ''),
        escapeCSV(item.actual_disconnection_date || ''),
        escapeCSV(item.planned_connection_date || ''),
        escapeCSV(item.actual_connection_date || ''),
        escapeCSV(item.disconnection_order || ''),
        escapeCSV(item.connection_order || '')
      ].join(';') + '\r\n';
    }).join('');
    
    // Добавляем BOM для правильной кодировки UTF-8
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = headers + rows;
    
    // Создаем Blob с правильным типом и названием
    const blob = new Blob([BOM, csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    console.log('CSV-файл успешно создан');
    return blob;
  } catch (error) {
    console.error('Ошибка экспорта в CSV:', error);
    throw error;
  }
};

// Получение списка инцидентов
export const getIncidents = async (page = 1): Promise<{
  items: Incident[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    const response = await fetchAPI(`/incident?page=${page}`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: response.data,
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      // Если ответ просто массив
      return {
        items: response,
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    } else {
      // Если формат ответа неизвестен
      console.warn('Неожиданный формат ответа:', response);
      throw new Error('Неожиданный формат ответа от сервера');
    }
  } catch (error) {
    console.error('Ошибка получения списка инцидентов:', error);
    throw error;
  }
};

// Получение деталей инцидента по ID
export const getIncidentById = async (id: number): Promise<Incident> => {
  try {
    return await fetchAPI(`/incident/${id}`);
  } catch (error) {
    console.error(`Ошибка получения инцидента с ID ${id}:`, error);
    throw error;
  }
};

// Получение типов инцидентов
export const getIncidentTypes = async (): Promise<IncidentType[]> => {
  try {
    return await fetchAPI('/incident-type');
  } catch (error) {
    console.error('Ошибка получения типов инцидентов:', error);
    throw error;
  }
};

// Получение типов ресурсов инцидентов
export const getIncidentResourceTypes = async (): Promise<ResourceType[]> => {
  try {
    return await fetchAPI('/incident-resource');
  } catch (error) {
    console.error('Ошибка получения типов ресурсов инцидентов:', error);
    throw error;
  }
};

// Создание нового инцидента
export const createIncident = async (data: Partial<Incident>): Promise<Incident> => {
  try {
    return await api.post<Incident>('/incident', data);
  } catch (error) {
    console.error('Ошибка создания инцидента:', error);
    throw error;
  }
};

// Обновление инцидента
export const updateIncident = async (id: number, data: Partial<Incident>): Promise<Incident> => {
  try {
    return await api.patch<Incident>(`/incident/${id}`, data);
  } catch (error) {
    console.error(`Ошибка обновления инцидента с ID ${id}:`, error);
    throw error;
  }
};

// Удаление инцидента
export const deleteIncident = async (id: number): Promise<boolean> => {
  try {
    const response = await api.delete<{message: boolean}>(`/incident/${id}`);
    return response.message;
  } catch (error) {
    console.error(`Ошибка удаления инцидента с ID ${id}:`, error);
    throw error;
  }
};

export const searchAddresses = async (cityId: number, searchQuery: string = ''): Promise<Address[]> => {
  try {
    // Правильный формат запроса: /addresses/{cityId}?search=ЗАПРОС
    const endpoint = searchQuery 
      ? `/addresses/${cityId}?search=${encodeURIComponent(searchQuery)}` 
      : `/addresses/${cityId}`;
    
    console.log(`Запрос адресов: ${endpoint}`);
    const response = await fetchAPI(endpoint);
    
    // Проверка и обработка ответа
    let addresses: Address[] = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      // Формат с пагинацией (вероятно)
      addresses = response.data;
    } else if (Array.isArray(response)) {
      // Простой массив
      addresses = response;
    }
    
    console.log(`Найдено ${addresses.length} адресов для города с ID ${cityId}`);
    return addresses;
  } catch (error) {
    console.error(`Ошибка при получении адресов для города с ID ${cityId}:`, error);
    throw error;
  }
};

// Добавьте функцию для преобразования формата адресов, если это необходимо
export const formatAddressesForSubmission = (addressIds: number[]): number[] => {
  // Проверяем, что все ID положительные целые числа
  return addressIds.filter(id => Number.isInteger(id) && id > 0);
};

//  олучения адресов по ID улицы
export const getAddressesByStreet = async (streetId: number): Promise<Address[]> => {
  try {
    console.log(`Запрос адресов для улицы с ID ${streetId}`);
    
    // Make sure we're using the correct endpoint format
    // According to your documentation, it should be /street/{streetId}/addresses
    const response = await fetchAPI(`/street/${streetId}/addresses`);
    console.log(`Получен ответ для адресов по улице ${streetId}:`, response);
    
    // Process the response properly
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Return empty array if no addresses found
    console.warn(`Не найдено адресов для улицы с ID ${streetId}`);
    return [];
  } catch (error) {
    console.error(`Ошибка при получении адресов для улицы с ID ${streetId}:`, error);
    return []; // Return empty array on error to avoid breaking the UI
  }
};

// Типы данных для тепловых карт
export interface HeatMapParams {
  name?: string;
  hs_type_id?: number;
  owner_id?: number;
  org_id?: number;
  hs_period_id?: number;
  oks_id?: number;
  resource_type_id?: number;
  equipment_type_id?: number;
}

export interface HeatSupplyMapItem {
  id: number;
  name: string;
  hs_type_id: number;
  owner_id: number;
  org_id: number;
  hs_period_id: number;
  oks_id: number;
  address_ids: number[];
  created_at: string;
  updated_at: string;
  parameters?: any;
  type?: any;
  owner?: any;
  org?: any;
  period?: any;
  oks?: any;
}

export interface CommunalServicesMapItem {
  id: number;
  entrance_count: number | null;
  address_id: number;
  buildingYear: string;
  cadastreNumber: string;
  guid: string;
  house_condition_id: number;
  house_type_id: number;
  management_org_id: number;
  municipality_org_id: number;
  planSeries: string;
  status: string;
  created_at: string;
  updated_at: string;
  address?: Address;
  house_condition?: any;
  house_type?: any;
  management_org?: any;
  municipality_org?: any;
  resource_outages?: any[];
  ozp_period?: {
    start_date: string;
    end_date: string;
  };
  incidents?: Incident[];
  rso?: any[];
}

// Получение данных для карты теплоснабжения
export const getHeatSupplyMapData = async (params: HeatMapParams = {}): Promise<HeatSupplyMapItem[]> => {
  try {
    let queryString = '';
    
    if (params.name) queryString += `&name=${encodeURIComponent(params.name)}`;
    if (params.hs_type_id) queryString += `&hs_type_id=${params.hs_type_id}`;
    if (params.owner_id) queryString += `&owner_id=${params.owner_id}`;
    if (params.org_id) queryString += `&org_id=${params.org_id}`;
    if (params.hs_period_id) queryString += `&hs_period_id=${params.hs_period_id}`;
    if (params.oks_id) queryString += `&oks_id=${params.oks_id}`;
    
    const endpoint = queryString ? `/heat-map?${queryString.substring(1)}` : '/heat-map';
    
    const response = await fetchAPI(endpoint);
    
    // Обработка пагинации
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    }
    
    console.warn('Неожиданный формат ответа от API теплоснабжения:', response);
    return [];
  } catch (error) {
    console.error('Ошибка получения данных карты теплоснабжения:', error);
    throw error;
  }
};


// Получение данных для карты свободных мощностей
export const getFreeCapacityMapData = async (params: HeatMapParams = {}): Promise<FreeCapacityArea[]> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.resource_type_id) queryParams.append('resource_type_id', params.resource_type_id.toString());
    if (params.equipment_type_id) queryParams.append('equipment_type_id', params.equipment_type_id.toString());
    if (params.org_id) queryParams.append('org_id', params.org_id.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/free-capacity?${queryString}` : '/free-capacity';

    console.log('Отправка запроса на:', endpoint);

    const response = await fetchAPI(endpoint);

    console.log('Ответ сервера:', response);

    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    }

    console.warn('Неожиданный формат ответа от API свободных мощностей:', response);
    return [];
  } catch (error) {
    console.error('Ошибка получения данных карты свободных мощностей:', error);
    throw error;
  }
};

// Получение данных для карты коммунальных услуг
export const getCommunalServicesMapData = async (): Promise<CommunalServicesMapItem[]> => {
  try {
    const response = await fetchAPI('/communal-services');
    
    // Обработка разных форматов ответа
    if (response && response.original && Array.isArray(response.original)) {
      return response.original;
    } else if (Array.isArray(response)) {
      return response;
    }
    
    console.warn('Неожиданный формат ответа от API коммунальных услуг:', response);
    return [];
  } catch (error) {
    console.error('Ошибка получения данных карты коммунальных услуг:', error);
    throw error;
  }
};

// Импорт данных из Excel
export const importHeatSourcesFromExcel = async (file: File): Promise<any> => {
  try {
    console.log('Импорт из Excel файла:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    if (!token) {
      throw new Error('Отсутствует токен авторизации');
    }
    
    const response = await fetch(`${API_URL}/hs/import/exel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData
    });
    
    console.log('Статус ответа:', response.status);
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Необходима повторная авторизация');
      }
      
      let errorMessage = `Ошибка импорта: ${response.status}`;
      try {
        const errorData = await response.json();
        console.log('Данные ошибки:', errorData);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.errors) {
          const errorDetails = Object.values(errorData.errors)
            .flat()
            .join(', ');
          errorMessage = errorDetails || errorMessage;
        }
      } catch (e) {
        console.error('Ошибка при обработке ответа:', e);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Результат импорта:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при импорте из Excel:', error);
    throw error;
  }
};

// Add this to your api.ts file, preferably near other MKD-related functions

// Function to update MKD schedule
export const updateMkdSchedule = async (id: number, scheduleData: {
  planned_disconnection_date: string | null;
  actual_disconnection_date: string | null;
  planned_connection_date: string | null;
  actual_connection_date: string | null;
  disconnection_order: string | null;
  connection_order: string | null;
}): Promise<any> => {
  // If you already have updateMkdWithSchedule, you can call it here
  // return updateMkdWithSchedule(id, scheduleData);
  
  // Otherwise implement the logic:
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('Authentication token missing');
  }

  try {
    console.log(`Updating MKD schedule for ID ${id}:`, scheduleData);
    const response = await fetch(`${API_URL}/mkd/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(scheduleData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Re-authorization required');
      }
      throw new Error(`Request error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error updating schedule for MKD with ID ${id}:`, error);
    throw error;
  }
};

// Тип данных для настроек из API
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  created_at: string | null;
  updated_at: string | null;
}

// Получение всех настроек
export const getSettingsList = async (): Promise<SystemSetting[]> => {
  try {
    return await api.get<SystemSetting[]>('/settings/settings');
  } catch (error) {
    console.error('Ошибка получения списка настроек:', error);
    throw error;
  }
};

// Получение настройки по ID
export const getSetting = async (id: number): Promise<SystemSetting> => {
  try {
    return await api.get<SystemSetting>(`/settings/settings/${id}`);
  } catch (error) {
    console.error(`Ошибка получения настройки с ID ${id}:`, error);
    throw error;
  }
};

// Получение настройки по ключу
export const getSettingByKey = async (key: string): Promise<SystemSetting | undefined> => {
  try {
    const settings = await getSettingsList();
    return settings.find(setting => setting.key === key);
  } catch (error) {
    console.error(`Ошибка получения настройки по ключу ${key}:`, error);
    throw error;
  }
};

// Обновление настройки
export const updateSetting = async (id: number, value: string): Promise<SystemSetting> => {
  try {
    return await api.patch<SystemSetting>(`/settings/settings/${id}`, { value });
  } catch (error) {
    console.error(`Ошибка обновления настройки с ID ${id}:`, error);
    throw error;
  }
};

// Загрузка изображения для фона страницы входа
export const uploadLoginBackground = async (file: File): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('img', file);
    
    const token = getToken();
    if (!token) {
      throw new Error('Отсутствует токен авторизации');
    }
    
    const response = await fetch(`${API_URL}/settings/background/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }
    
    const data = await response.json();
    return data.message === true;
  } catch (error) {
    console.error('Ошибка при загрузке фона страницы входа:', error);
    throw error;
  }
};

// Получение URL фона страницы входа (публичный эндпоинт)
export const getLoginBackgroundUrl = async (): Promise<string | null> => {
  try {
    // Пытаемся получить настройки без авторизации
    const response = await fetch(`${API_URL}/settings/settings`);
    
    if (!response.ok) {
      return null;
    }
    
    const settings = await response.json();
    const loginImgSetting = Array.isArray(settings) ? 
      settings.find(s => s.key === 'login_img') : null;
    
    return loginImgSetting?.value || null;
  } catch (error) {
    console.error('Ошибка получения URL фона страницы входа:', error);
    return null;
  }
};

// Функция для получения данных мониторинга
export const getMonitoringData = async (page = 1): Promise<any> => {
  try {
    return await fetchAPI(`/monitoring?page=${page}`);
  } catch (error) {
    console.error('Ошибка получения данных мониторинга:', error);
    throw error;
  }
};

// Типы данных для графиков отопительного периода
export interface HeatingScheduleItem {
  id: number;
  status: boolean;
  planned_disconnection_date: string | null;
  planned_connection_date: string | null;
  actual_disconnection_date: string | null;
  actual_connection_date: string | null;
  disconnection_omsu_order_number: string | null;
  disconnection_omsu_order_date: string | null;
  disconnection_omsu_order_title: string | null;
  disconnection_omsu_order_additional_info: string | null;
  connection_omsu_order_number: string | null;
  connection_omsu_order_date: string | null;
  connection_omsu_order_title: string | null;
  connection_omsu_order_additional_info: string | null;
  created_at: string;
  updated_at: string;
  mkd?: any;
  address?: {
    id: number;
    street_id: number;
    house_number: string;
    building: string | null;
    structure: string | null;
    literature: string | null;
    latitude: string;
    longitude: string;
    street: {
      id: number;
      name: string;
      city: {
        id: number;
        name: string;
      }
    }
  };
}

export interface HeatingScheduleApiResponse {
  current_page: number;
  data: HeatingScheduleItem[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface HeatingScheduleFormData {
  mkd_id: number;
  address_id: number;
  status: boolean;
  planned_disconnection_date: string | null;
  planned_connection_date: string | null;
  actual_disconnection_date: string | null;
  actual_connection_date: string | null;
  disconnection_omsu_order_number: string | null;
  disconnection_omsu_order_date: string | null;
  disconnection_omsu_order_title: string | null;
  disconnection_omsu_order_additional_info: string | null;
  connection_omsu_order_number: string | null;
  connection_omsu_order_date: string | null;
  connection_omsu_order_title: string | null;
  connection_omsu_order_additional_info: string | null;
}

// Получение списка графиков отопительного периода
export const getHeatingSchedule = async (
  cityId?: number, 
  streetId?: number, 
  houseNumber?: string
): Promise<HeatingScheduleApiResponse> => {
  try {
    let queryParams = [];
    if (cityId) queryParams.push(`city_id=${cityId}`);
    if (streetId) queryParams.push(`street_id=${streetId}`);
    if (houseNumber) queryParams.push(`house_number=${encodeURIComponent(houseNumber)}`);
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    
    return await fetchAPI(`/heating-schedule${queryString}`);
  } catch (error) {
    throw error;
  }
};

// Получение детальной информации о графике отопления
export const getHeatingScheduleById = async (id: number): Promise<HeatingScheduleItem> => {
  try {
    return await fetchAPI(`/heating-schedule/${id}`);
  } catch (error) {
    throw error;
  }
};

// Создание нового графика отопления
export const createHeatingSchedule = async (data: HeatingScheduleFormData): Promise<HeatingScheduleItem> => {
  try {
    return await fetchAPI('/heating-schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    throw error;
  }
};

// Обновление графика отопления
export const updateHeatingSchedule = async (id: number, data: Partial<HeatingScheduleFormData>): Promise<HeatingScheduleItem> => {
  try {
    return await fetchAPI(`/heating-schedule/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  } catch (error) {
    throw error;
  }
};

// Удаление графика отопления
export const deleteHeatingSchedule = async (id: number): Promise<boolean> => {
  try {
    const response = await fetchAPI(`/heating-schedule/${id}`, {
      method: 'DELETE'
    });
    return response.message === true;
  } catch (error) {
    throw error;
  }
};

// ЕДДС API types
export interface EddsCoordinates {
  center_lat: string;
  center_lng: string;
  south_west_lat: string;
  south_west_lng: string;
  north_east_lat: string;
  north_east_lng: string;
}

export interface EddsIncident {
  id: number;
  title: string;
  description: string;
  is_complaint: boolean;
  created_at: string;
  updated_at: string;
  addresses: Address[];
  type: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  resource_type: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  status: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
}

export interface EddsResponse {
  coordinates: EddsCoordinates;
  incidents: {
    current_page: number;
    data: EddsIncident[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

export const getEddsAccidents = async (
  params: {
    title?: string;
    description?: string;
    incident_type_id?: number;
    incident_resource_type_id?: number;
    incident_status_id?: number;
    is_complaint?: boolean;
    page?: number;
  } = {}
): Promise<EddsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.title) queryParams.append('title', params.title);
    if (params.description) queryParams.append('description', params.description);
    if (params.incident_type_id) queryParams.append('incident_type_id', params.incident_type_id.toString());
    if (params.incident_resource_type_id) queryParams.append('incident_resource_type_id', params.incident_resource_type_id.toString());
    if (params.incident_status_id) queryParams.append('incident_status_id', params.incident_status_id.toString());
    if (params.is_complaint !== undefined) queryParams.append('is_complaint', params.is_complaint.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return await fetchAPI(`/edds/incident${queryString}`);
  } catch (error) {
    console.error('Ошибка получения данных аварий:', error);
    throw error;
  }
};

export const getEddsPlannedWorks = async (
  params: {
    title?: string;
    description?: string;
    incident_type_id?: number;
    incident_resource_type_id?: number;
    incident_status_id?: number;
    is_complaint?: boolean;
    page?: number;
  } = {}
): Promise<EddsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.title) queryParams.append('title', params.title);
    if (params.description) queryParams.append('description', params.description);
    if (params.incident_type_id) queryParams.append('incident_type_id', params.incident_type_id.toString());
    if (params.incident_resource_type_id) queryParams.append('incident_resource_type_id', params.incident_resource_type_id.toString());
    if (params.incident_status_id) queryParams.append('incident_status_id', params.incident_status_id.toString());
    if (params.is_complaint !== undefined) queryParams.append('is_complaint', params.is_complaint.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return await fetchAPI(`/edds/planned${queryString}`);
  } catch (error) {
    console.error('Ошибка получения данных плановых работ:', error);
    throw error;
  }
};

export const getEddsSeasonalWorks = async (
  params: {
    title?: string;
    description?: string;
    incident_type_id?: number;
    incident_resource_type_id?: number;
    incident_status_id?: number;
    is_complaint?: boolean;
    page?: number;
  } = {}
): Promise<EddsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.title) queryParams.append('title', params.title);
    if (params.description) queryParams.append('description', params.description);
    if (params.incident_type_id) queryParams.append('incident_type_id', params.incident_type_id.toString());
    if (params.incident_resource_type_id) queryParams.append('incident_resource_type_id', params.incident_resource_type_id.toString());
    if (params.incident_status_id) queryParams.append('incident_status_id', params.incident_status_id.toString());
    if (params.is_complaint !== undefined) queryParams.append('is_complaint', params.is_complaint.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    return await fetchAPI(`/edds/seasonal${queryString}`);
  } catch (error) {
    console.error('Ошибка получения данных сезонных работ:', error);
    throw error;
  }
};

// Типы данных для свободных мощностей
export interface FreeCapacityItem {
  id: number;
  coordinates: [number, number][];
  created_at: string;
  updated_at: string;
  resource?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  equipment?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
  };
  org?: {
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
  };
  resource_type_id?: number;
  equipment_type_id?: number;
  org_id?: number;
}

export interface FreeCapacityParams {
  name?: string;
  resource_type_id?: number;
  equipment_type_id?: number;
  org_id?: number;
}

export interface FreeCapacityCreateData {
  resource_type_id: number;
  equipment_type_id: number;
  org_id: number;
  coordinates: [number, number][];
}

export interface FreeCapacityResponse {
  items: FreeCapacityItem[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

// Получение списка свободных мощностей с пагинацией
export const getFreeCapacityList = async (page = 1, params: FreeCapacityParams = {}): Promise<FreeCapacityResponse> => {
  try {
    let queryString = `page=${page}`;
    
    if (params.name) queryString += `&name=${encodeURIComponent(params.name)}`;
    if (params.resource_type_id) queryString += `&resource_type_id=${params.resource_type_id}`;
    if (params.equipment_type_id) queryString += `&equipment_type_id=${params.equipment_type_id}`;
    if (params.org_id) queryString += `&org_id=${params.org_id}`;
    
    const endpoint = `/free-capacity?${queryString}`;
    
    const response = await fetchAPI(endpoint);
    
    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: response.data,
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      return {
        items: response,
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    }
    
    console.warn('Неожиданный формат ответа от API:', response);
    throw new Error('Неожиданный формат ответа от сервера');
  } catch (error) {
    console.error('Ошибка получения списка свободных мощностей:', error);
    throw error;
  }
};

// Получение детальной информации о свободной мощности
export const getFreeCapacityById = async (id: number): Promise<FreeCapacityItem> => {
  try {
    return await fetchAPI(`/free-capacity/${id}`);
  } catch (error) {
    console.error(`Ошибка получения свободной мощности с ID ${id}:`, error);
    throw error;
  }
};

// Создание новой записи о свободной мощности
export const createFreeCapacity = async (data: FreeCapacityCreateData): Promise<FreeCapacityItem> => {
  try {
    return await api.post<FreeCapacityItem>('/free-capacity', data);
  } catch (error) {
    console.error('Ошибка создания записи о свободной мощности:', error);
    throw error;
  }
};

// Обновление записи о свободной мощности
export const updateFreeCapacity = async (id: number, data: Partial<FreeCapacityCreateData>): Promise<FreeCapacityItem> => {
  try {
    return await api.patch<FreeCapacityItem>(`/free-capacity/${id}`, data);
  } catch (error) {
    console.error(`Ошибка обновления свободной мощности с ID ${id}:`, error);
    throw error;
  }
};

// Удаление записи о свободной мощности
export const deleteFreeCapacity = async (id: number): Promise<boolean> => {
  try {
    const response = await api.delete<{message: boolean}>(`/free-capacity/${id}`);
    return response.message;
  } catch (error) {
    console.error(`Ошибка удаления свободной мощности с ID ${id}:`, error);
    throw error;
  }
};

// Получение типов ресурсов
export const getResourceTypes = async (): Promise<any[]> => {
  try {
    return await fetchAPI('/resource-types');
  } catch (error) {
    console.error('Ошибка получения типов ресурсов:', error);
    throw error;
  }
};

// Получение типов оборудования
export const getEquipmentTypes = async (): Promise<any[]> => {
  try {
    return await fetchAPI('/equipment-types');
  } catch (error) {
    console.error('Ошибка получения типов оборудования:', error);
    throw error;
  }
};

// Action Log types
export interface ActionLogType {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ActionLog {
  id: number;
  type_id: number;
  user_id: number;
  ip_address: string;
  action: string;
  created_at: string;
  updated_at: string;
  type?: ActionLogType;
  user?: SettingsUser;
}

export interface ActionLogParams {
  type_id?: number;
  user_id?: number;
  ip_address?: string;
  action?: string;
  page?: number;
}

// Get logs with filtering
export const getActionLogs = async (params: ActionLogParams = {}): Promise<{
  items: ActionLog[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.type_id) queryParams.append('type_id', params.type_id.toString());
    if (params.user_id) queryParams.append('user_id', params.user_id.toString());
    if (params.ip_address) queryParams.append('ip_address', params.ip_address);
    if (params.action) queryParams.append('action', params.action);
    if (params.page) queryParams.append('page', params.page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const response = await api.get<any>(`/settings/actions${queryString}`);
    
    if (response && response.data && Array.isArray(response.data)) {
      return {
        items: response.data,
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
        totalItems: response.total || response.data.length
      };
    } else if (Array.isArray(response)) {
      return {
        items: response,
        currentPage: 1,
        totalPages: 1,
        totalItems: response.length
      };
    }
    
    return {
      items: [],
      currentPage: 1,
      totalPages: 1,
      totalItems: 0
    };
  } catch (error) {
    console.error('Ошибка получения журнала действий:', error);
    throw error;
  }
};

// Get action types for filtering
export const getActionTypes = async (): Promise<ActionLogType[]> => {
  try {
    return await api.get<ActionLogType[]>('/settings/action-types');
  } catch (error) {
    console.error('Ошибка получения типов действий:', error);
    return [];
  }
};

// данные для карты

export interface MapBoundaries {
  center_lat: number;
  center_lng: number;
  south_west_lat: number;
  south_west_lng: number;
  north_east_lat: number;
  north_east_lng: number;
}

export const fetchUserCoords = async (): Promise<MapBoundaries | null> => {
  try {
    const response = await api.get<MapBoundaries>('/me'); // Изменено на MapBoundaries вместо MapBoundaries[]
    return {
      center_lat: parseFloat(response.center_lat),
      center_lng: parseFloat(response.center_lng),
      south_west_lat: parseFloat(response.south_west_lat),
      south_west_lng: parseFloat(response.south_west_lng),
      north_east_lat: parseFloat(response.north_east_lat),
      north_east_lng: parseFloat(response.north_east_lng)
    };
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
    return null;
  }
};

// Интерфейсы для ресурсов и оборудования
export interface FreeCapacityResource {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface FreeCapacityEquipment {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// Метод для получения списка ресурсов
export const getFreeCapacityResources = async (): Promise<FreeCapacityResource[]> => {
  try {
    const response = await api.get<FreeCapacityResource[]>('/free-capacity-resources');
    if (Array.isArray(response)) {
      return response;
    } else {
      console.error('Полученные данные не являются массивом:', response);
      return [];
    }
  } catch (err) {
    console.error('Ошибка при получении списка ресурсов:', err);
    return [];
  }
};

// Метод для получения списка оборудования
export const getFreeCapacityEquipment = async (): Promise<FreeCapacityEquipment[]> => {
  try {
    const response = await api.get<FreeCapacityEquipment[]>('/free-capacity-equipment');
    if (Array.isArray(response)) {
      return response;
    } else {
      console.error('Полученные данные не являются массивом:', response);
      return [];
    }
  } catch (err) {
    console.error('Ошибка при получении списка оборудования:', err);
    return [];
  }
};