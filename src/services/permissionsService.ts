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
    // Сохраняем полученные права в localStorage
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    return permissions;
  } catch (error) {
    console.error('Ошибка при загрузке прав доступа:', error);
    return {};
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

// Проверка наличия конкретного права у пользователя
export const hasPermission = async (permissionSlug: string): Promise<boolean> => {
  try {
    // Если проверяем административное право
    if (permissionSlug === 'admin_access' || permissionSlug === 'admin_users') {
      // Проверка административных прав через роли пользователя
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.roles && Array.isArray(user.roles)) {
        const isAdmin = user.roles.some((role: any) => 
          role.slug === 'admin' || 
          role.slug === 'super_admin' || 
          (role.name && role.name.toLowerCase().includes('админ'))
        );
        return isAdmin;
      }
      
      if (user.role) {
        if (typeof user.role === 'object') {
          return user.role.slug === 'admin' || 
                 user.role.slug === 'super_admin' || 
                 (user.role.name && user.role.name.toLowerCase().includes('админ'));
        }
        if (typeof user.role === 'string') {
          return user.role.toLowerCase().includes('admin');
        }
      }
      
      // Если не нашли роль админа
      return false;
    }
    
    // Для остальных прав проверяем через API
    // Если права не загружены, загружаем их
    if (!localStorage.getItem(PERMISSIONS_STORAGE_KEY)) {
      await fetchPermissions();
    }
    
    // Отправляем запрос на проверку конкретного права
    const response = await api.post<{access: boolean}>(`/permissions/${permissionSlug}`, {});
    return response.access;
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
  
  if (permissionSlug in permissionCache) {
    return permissionCache[permissionSlug];
  }
  
  const result = await hasPermission(permissionSlug);
  permissionCache[permissionSlug] = result;
  
  return result;
};

// Инициализация прав при загрузке приложения
export const initPermissions = async (): Promise<void> => {
  await fetchPermissions();
};