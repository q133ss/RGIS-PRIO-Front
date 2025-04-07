import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';
import Layout from '../Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Компонент для защиты маршрутов, требующих авторизации
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = isAuthenticated();
  
  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  
  // Если пользователь авторизован, отображаем запрошенную страницу внутри Layout
  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;