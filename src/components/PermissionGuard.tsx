// src/components/PermissionGuard.tsx

import React from 'react';
import usePermission from '../hooks/usePermission';

interface PermissionGuardProps {
  permission: string | string[] | null;
  fallback?: React.ReactNode; // Что показывать, если нет прав
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  fallback = null, 
  children 
}) => {
  const { hasAccess, loading } = usePermission(permission);

  if (loading) {
    return <div className="loading-permission">Проверка прав...</div>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;