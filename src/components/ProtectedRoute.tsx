import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkPermissionWithCache } from '../services/permissionsService';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  permission?: string | string[];
  roles?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children,
  permission, 
  roles, 
  redirectTo = '/access-denied' 
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const location = useLocation();

  // Проверка аутентификации
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Проверка прав доступа
  useEffect(() => {
    const checkAccess = async () => {
      // Если пользователь не аутентифицирован, нет смысла проверять права
      if (!isAuthenticated) {
        setHasAccess(false);
        return;
      }

      // Если нет ограничений, разрешаем доступ
      if (!permission && (!roles || roles.length === 0)) {
        setHasAccess(true);
        return;
      }

      try {
        // Проверка прав
        if (permission) {
          let permissionGranted = false;
          
          if (Array.isArray(permission)) {
            // Если передан массив, проверяем наличие любого из прав
            const results = await Promise.all(
              permission.map(p => checkPermissionWithCache(p))
            );
            permissionGranted = results.some(result => result === true);
          } else {
            // Если передано одно право, проверяем его
            permissionGranted = await checkPermissionWithCache(permission);
          }
          
          if (!permissionGranted) {
            console.log(`Доступ запрещен: нет прав ${permission}`);
            setHasAccess(false);
            return;
          }
        }
        
        // Проверка ролей
        if (roles && roles.length > 0) {
          const userStr = localStorage.getItem('user');
          if (!userStr) {
            setHasAccess(false);
            return;
          }
          
          const user = JSON.parse(userStr);
          let userRoles: string[] = [];
          
          if (Array.isArray(user.roles)) {
            userRoles = user.roles.map((role: any) => 
              typeof role === 'string' ? role : (role.slug || role.name)
            );
          } else if (user.role) {
            userRoles = [typeof user.role === 'string' ? 
              user.role : (user.role.slug || user.role.name)];
          }
          
          const hasRole = roles.some(role => userRoles.includes(role));
          
          if (!hasRole) {
            console.log(`Доступ запрещен: нет ролей ${roles.join(', ')}`);
            setHasAccess(false);
            return;
          }
        }
        
        // Если все проверки пройдены
        setHasAccess(true);
      } catch (error) {
        console.error('Ошибка при проверке доступа:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, permission, roles, location.pathname]);

  // Если нет аутентификации, перенаправляем на логин
  if (!isAuthenticated) {
    console.log('Перенаправление на логин: не аутентифицирован');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Показываем индикатор загрузки, пока проверяем
  if (hasAccess === null) {
    return <div className="route-permission-loading">Проверка прав доступа...</div>;
  }

  // Если нет доступа, перенаправляем на страницу доступа запрещен
  if (hasAccess === false) {
    console.log('Перенаправление на страницу доступа запрещен');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Если есть доступ, отображаем содержимое маршрута
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;