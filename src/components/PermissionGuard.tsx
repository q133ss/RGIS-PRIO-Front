import React, { ReactNode, useEffect, useState } from 'react';
import { checkPermissionWithCache } from '../services/permissionsService';

interface PermissionGuardProps {
  permissionSlug: string | null;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Компонент для условного отображения элементов интерфейса в зависимости от прав доступа
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permissionSlug, 
  children, 
  fallback = null 
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!permissionSlug) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      try {
        const result = await checkPermissionWithCache(permissionSlug);
        setHasAccess(result);
      } catch {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [permissionSlug]);

  if (loading) return null;
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;