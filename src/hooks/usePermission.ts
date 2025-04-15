import { useState, useEffect } from 'react';
import { checkPermissionWithCache, isAdmin } from '../services/permissionsService';

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
        
        // Если пользователь администратор, доступ разрешен всегда
        if (isAdmin()) {
          setHasAccess(true);
          return;
        }
        
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
 * @returns Объект с флагами isAdminUser и loading
 */
export const useAdminAccess = () => {
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminAccess = () => {
      try {
        setLoading(true);
        const adminStatus = isAdmin();
        setIsAdminUser(adminStatus);
      } catch (error) {
        console.error('Ошибка при проверке административного доступа:', error);
        setIsAdminUser(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  return { isAdmin: isAdminUser, loading };
};

export default usePermission;