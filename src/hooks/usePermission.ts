import { useState, useEffect } from 'react';
import { checkPermissionWithCache } from '../services/permissionsService';

/**
 * Хук для проверки разрешений с отслеживанием состояния загрузки
 * @param permissionSlug Slug разрешения для проверки
 * @returns Объект с флагами hasAccess и loading
 */
const usePermission = (permissionSlug: string) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        
        // Стандартная проверка прав через сервис
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
        const hasAccess = await checkPermissionWithCache('admin_access');
        setIsAdmin(hasAccess);
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