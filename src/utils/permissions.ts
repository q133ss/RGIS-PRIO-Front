import { checkUserPermission } from '../services/api';

// Список всех возможных прав (permissionsList)
export const permissionsList = [
  'view_hs', 'create_hs', 'update_hs', 'delete_hs',
  'view_hs_type', 'create_hs_type', 'update_hs_type', 'delete_hs_type',
  'view_org', 'create_org', 'update_org', 'delete_org',
  'view_hs_period', 'create_hs_period', 'update_hs_period', 'delete_hs_period',
  'view_oks', 'create_oks', 'update_oks', 'delete_oks',
  'view_mkd', 'create_mkd', 'update_mkd', 'delete_mkd'
];

// Кэш для результатов проверки доступа
const permissionCache: Record<string, boolean> = {};

// Разрешения, которые дают доступ к панели администратора
const ADMIN_PERMISSIONS = [
  // Системные разрешения (могут отсутствовать в списке)
  'admin_users',
  'super_admin',
  'admin_access',
  
  // Разрешения из вашего API (есть в Postman)
  'create_hs_type',      // Добавление типов теплоисточников
  'update_hs_type',      // Редактирование типов теплоисточников
  'delete_hs_type',      // Удаление типов теплоисточников
  'create_org',          // Добавление организаций
  'update_org',          // Редактирование организаций
  'delete_org',          // Удаление организаций
  'create_hs_period',    // Добавление периодов теплоисточников
  'update_hs_period',    // Редактирование периодов теплоисточников
  'delete_hs_period'     // Удаление периодов теплоисточников
];

/**
 * Проверяет, имеет ли текущий пользователь доступ к определенному разрешению
 * с использованием кэширования для производительности
 */
export const hasPermission = async (permissionSlug: string): Promise<boolean> => {
  // Проверка наличия в кэше
  if (permissionSlug in permissionCache) {
    return permissionCache[permissionSlug];
  }
  
  try {
    const hasAccess = await checkUserPermission(permissionSlug);
    permissionCache[permissionSlug] = hasAccess;
    return hasAccess;
  } catch (error) {
    console.error(`Ошибка проверки разрешения ${permissionSlug}:`, error);
    return false;
  }
};

/**
 * Проверяет, есть ли у пользователя права администратора
 * путем проверки наличия любого из административных разрешений
 */
export const hasAdminAccess = async (): Promise<boolean> => {
  // Проверяем все возможные разрешения администратора
  for (const permission of ADMIN_PERMISSIONS) {
    try {
      // Если результат уже в кэше, используем его
      if (permission in permissionCache) {
        if (permissionCache[permission]) {
          console.log(`Доступ разрешен через кэшированное разрешение: ${permission}`);
          return true;
        }
        continue;
      }
      
      // Иначе делаем запрос
      console.log(`Проверка разрешения: ${permission}`);
      const hasAccess = await checkUserPermission(permission);
      permissionCache[permission] = hasAccess;
      
      if (hasAccess) {
        console.log(`Доступ разрешен через разрешение: ${permission}`);
        return true;
      }
    } catch (error) {
      console.error(`Ошибка проверки разрешения ${permission}:`, error);
    }
  }
  
  console.log(`Доступ запрещен - не найдено подходящих разрешений`);
  return false;
};

/**
 * Очистка кэша разрешений (например, при выходе пользователя)
 */
export const clearPermissionsCache = (): void => {
  for (const key in permissionCache) {
    delete permissionCache[key];
  }
};