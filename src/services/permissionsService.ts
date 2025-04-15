import { api } from "./api";

// Ключ для хранения прав в localStorage
const PERMISSIONS_STORAGE_KEY = 'user_permissions';

// Интерфейс для прав доступа
export interface Permissions {
  [key: string]: string;
}

// Загрузка всех доступных прав с сервера
export const fetchPermissions = async (): Promise<Permissions> => {
  try {
    const permissions = await api.get<Permissions>('/permissions');
    console.log('Получены права с сервера:', permissions);
    // Сохраняем полученные права в localStorage
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    return permissions;
  } catch (error) {
    console.error('Ошибка при загрузке прав доступа:', error);
    // Возвращаем сохраненные права, если не удалось загрузить новые
    return getStoredPermissions();
  }
};

// Получение прав из localStorage
export const getStoredPermissions = (): Permissions => {
  const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
  if (!stored) return {};
  
  try {
    return JSON.parse(stored) as Permissions;
  } catch (error) {
    console.error('Ошибка при разборе прав из localStorage:', error);
    return {};
  }
};

// Улучшенная проверка, является ли пользователь администратором
export const isAdmin = (): boolean => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    
    // Проверка через массив ролей
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.some((role: any) => {
        if (typeof role === 'string') {
          return role === 'admin' || role === 'super_admin' || role.toLowerCase().includes('admin');
        }
        return (role.slug === 'admin' || role.slug === 'super_admin' || 
               (role.name && role.name.toLowerCase().includes('admin')));
      });
    }
    
    // Проверка через одну роль
    if (user.role) {
      if (typeof user.role === 'string') {
        return user.role === 'admin' || user.role === 'super_admin' || user.role.toLowerCase().includes('admin');
      }
      return (user.role.slug === 'admin' || user.role.slug === 'super_admin' || 
             (user.role.name && user.role.name.toLowerCase().includes('admin')));
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при проверке прав администратора:', error);
    return false;
  }
};

// Проверка наличия конкретного права у пользователя
export const hasPermission = async (permissionSlug: string): Promise<boolean> => {
  try {
    // Если пользователь - администратор, у него есть все права
    if (isAdmin()) {
      console.log(`Пользователь является администратором - право ${permissionSlug} доступно`);
      return true;
    }
    
    // Если проверяем административное право
    if (permissionSlug === 'admin_access' || permissionSlug === 'admin_users') {
      return isAdmin();
    }
    
    // Для остальных прав проверяем через API
    // Если права не загружены, загружаем их
    if (!localStorage.getItem(PERMISSIONS_STORAGE_KEY)) {
      await fetchPermissions();
    }
    
    // Сначала проверяем в локальном кэше прав
    const permissions = getStoredPermissions();
    if (permissionSlug in permissions) {
      console.log(`Право ${permissionSlug} найдено в локальном кэше: ${permissions[permissionSlug]}`);
      return true;
    }
    
    // Если в кэше нет, отправляем запрос на проверку
    try {
      const response = await api.post<{access: boolean}>(`/permissions/${permissionSlug}`, {});
      console.log(`Проверка права ${permissionSlug} через API: ${response.access}`);
      return response.access;
    } catch (apiError) {
      console.error(`Ошибка при проверке права ${permissionSlug} через API:`, apiError);
      return false;
    }
  } catch (error) {
    console.error(`Ошибка при проверке права ${permissionSlug}:`, error);
    return false;
  }
};

// Кэш результатов проверки прав для оптимизации
const permissionCache: Record<string, boolean> = {};

// Проверка права с кэшированием результата
export const checkPermissionWithCache = async (permissionSlug: string | null): Promise<boolean> => {
  if (!permissionSlug) return true;
  
  // Администраторам доступно всё
  if (isAdmin()) {
    return true;
  }
  
  if (permissionSlug in permissionCache) {
    return permissionCache[permissionSlug];
  }
  
  const result = await hasPermission(permissionSlug);
  permissionCache[permissionSlug] = result;
  
  return result;
};

// Сброс кэша прав (например, при смене пользователя)
export const clearPermissionCache = (): void => {
  Object.keys(permissionCache).forEach(key => {
    delete permissionCache[key];
  });
};

// Инициализация прав при загрузке приложения
export const initPermissions = async (): Promise<void> => {
  try {
    clearPermissionCache(); // Сбрасываем кэш перед инициализацией
    await fetchPermissions();
    console.log('Права успешно инициализированы');
  } catch (error) {
    console.error('Ошибка при инициализации прав:', error);
  }
};