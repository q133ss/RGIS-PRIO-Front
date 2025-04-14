import { useState, useEffect } from 'react';
import { checkPermissionWithCache } from '../services/permissionsService';

/**
 * Хук для проверки разрешений с отслеживанием состояния загрузки
 * @param permissionSlug Slug разрешения для проверки или массив slug'ов (требуется один из списка)
 * @returns Объект с флагами hasAccess и loading
 */
const usePermission = (permissionSlug: string | string[] | null) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        
        // Если permissionSlug равен null, считаем что доступ разрешен
        if (permissionSlug === null) {
          setHasAccess(true);
          return;
        }
        
        // Если передан массив, проверяем наличие любого из указанных прав
        if (Array.isArray(permissionSlug)) {
          if (permissionSlug.length === 0) {
            setHasAccess(true);
            return;
          }
          
          // Проверяем каждое право, если хоть одно есть - доступ разрешен
          const results = await Promise.all(
            permissionSlug.map(slug => checkPermissionWithCache(slug))
          );
          
          setHasAccess(results.some(result => result === true));
          return;
        }
        
        // Стандартная проверка одного права
        const result = await checkPermissionWithCache(permissionSlug);
        setHasAccess(result);
      } catch (error) {
        console.error(`Ошибка при проверке разрешения ${permissionSlug}:`, error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [permissionSlug]);

  return { hasAccess, loading };
};

/**
 * Хук для проверки доступа администратора
 * @returns Объект с флагами isAdmin и loading
 */
export const useAdminAccess = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setLoading(true);
        
        // Проверяем наличие административных прав
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setIsAdmin(false);
          return;
        }
        
        try {
          const user = JSON.parse(userStr);
          let userRoles: string[] = [];
          
          // Обработка разных форматов ролей в пользователе
          if (Array.isArray(user.roles)) {
            userRoles = user.roles.map((role: any) => 
              typeof role === 'string' ? role : (role.slug || role.name)
            );
          } else if (user.role) {
            userRoles = [typeof user.role === 'string' ? 
              user.role : (user.role.slug || user.role.name)];
          }
          
          // Проверяем, является ли пользователь администратором
          const hasAdminRole = userRoles.some(role => 
            role === 'admin' || role === 'super_admin' || role.includes('admin')
          );
          
          setIsAdmin(hasAdminRole);
          
        } catch (e) {
          console.error('Ошибка при проверке ролей администратора:', e);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Ошибка при проверке административного доступа:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  return { isAdmin, loading };
};

export default usePermission;