import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { routes, nonAuthRoutes } from './allRoutes';
import Layout from '../Layout';
// Простой компонент загрузки
const Loader = () => <div className="loader-container"><div className="loader"></div></div>;
import Login from '../pages/Pages/Login';
import { isAuthenticated } from '../services/api';

const Routing = () => {
  // Проверка авторизации перед рендерингом защищенных маршрутов
  const handleProtectedRoute = (Component: React.ReactNode) => {
    if (isAuthenticated()) {
      return <Layout>{Component}</Layout>;
    } else {
      return <Navigate to="/login" replace />;
    }
  };

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Главная страница перенаправляет на логин или дашборд */}
        <Route 
          path="/" 
          element={
            isAuthenticated() ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        {/* Маршрут логина перенаправляет на дашборд, если пользователь авторизован */}
        <Route 
          path="/login" 
          element={
            isAuthenticated() ? 
              <Navigate to="/dashboard" replace /> : 
              <Login />
          }
        />
        
        {/* Публичные маршруты (не требующие авторизации) */}
        {nonAuthRoutes
          .filter(route => route.path !== '/pages/login-v2') // Исключаем старый путь логина
          .map((route, index) => (
            <Route 
              key={index} 
              path={route.path} 
              element={route.component} 
            />
          ))}
        
        {/* Защищенные маршруты */}
        {routes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={handleProtectedRoute(route.component)} 
          />
        ))}
        
        {/* Маршрут для страницы 404 */}
        <Route path="*" element={<Navigate to="/pages/error-404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Routing;