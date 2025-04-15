import React from 'react';
import { BrowserRouter, Route, Routes as ReactRoutes, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { routes, nonAuthRoutes } from './allRoutes';

// Импортируем компонент логина
import Login from '../pages/Pages/Login';
import AccessDenied from '../pages/Pages/AccessDenied2';

// Исключаем старый маршрут для LoginV2
const filteredNonAuthRoutes = nonAuthRoutes.filter(
    route => route.path !== '/pages/login-v2'
);

// Определяем соответствие маршрутов и требуемых прав
const routePermissions: Record<string, string | string[]> = {
    '/dashboard': 'view_hs',
    '/mkd': 'view_mkd',
    '/incidents': 'view_hs',
    '/incidents/map': 'view_hs',
    '/outages': 'view_hs',
    '/maps/communal-services': ['view_hs', 'view_mkd'],
    '/maps/heat-supply': 'view_hs',
    '/maps/free-capacity': 'view_hs',
    '/free-capacity-list': 'view_hs',
    '/edds/accidents': ['view_hs', 'view_mkd'],
    '/edds/planned-works': ['view_hs', 'view_mkd'],
    '/edds/seasonal-works': ['view_hs', 'view_mkd'],
    '/mkd-graph': ['view_hs', 'view_mkd'],
    '/monitoring': ['view_hs', 'view_mkd'],
    '/buildings-list': 'view_mkd',
    '/heat-sources': 'view_hs',
    '/registers/heat-supply/heating-periods': ['view_hs', 'view_mkd'],
    '/registers/mkd/schedules': 'view_mkd',
};

// Маршруты только для администраторов
const adminRoutes = [
    '/admin/settings',
    '/admin/users',
    '/admin/roles',
    '/admin/logs'
];

const Routes: React.FC = () => {
    return (
        <ReactRoutes>
            {/* Перенаправление с главной страницы на логин */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Новый маршрут для компонента авторизации */}
            <Route path="/login" element={<Login />} />
            
            {/* Страница "Доступ запрещен" */}
            <Route path="/access-denied" element={<AccessDenied />} />
            
            {/* Маршруты, не требующие авторизации */}
            {filteredNonAuthRoutes.map((route, index) => (
                <Route key={index} path={route.path} element={route.component} />
            ))}
            
            {/* ВАЖНОЕ ИЗМЕНЕНИЕ: отдельные защищённые маршруты */}
            {routes.map((route, index) => {
                // Проверка для административных маршрутов
                if (adminRoutes.includes(route.path)) {
                    return (
                        <Route 
                            key={index} 
                            path={route.path} 
                            element={
                                <ProtectedRoute 
                                    roles={["admin", "super_admin"]} 
                                    redirectTo="/access-denied"
                                >
                                    {route.component}
                                </ProtectedRoute>
                            } 
                        />
                    );
                } 
                
                // Маршруты с проверкой конкретных прав
                else if (routePermissions[route.path]) {
                    return (
                        <Route 
                            key={index} 
                            path={route.path} 
                            element={
                                <ProtectedRoute 
                                    permission={routePermissions[route.path]} 
                                    redirectTo="/access-denied"
                                >
                                    {route.component}
                                </ProtectedRoute>
                            } 
                        />
                    );
                } 
                
                // Обычные защищенные маршруты без особых требований
                else {
                    return (
                        <Route 
                            key={index} 
                            path={route.path} 
                            element={
                                <ProtectedRoute>
                                    {route.component}
                                </ProtectedRoute>
                            } 
                        />
                    );
                }
            })}
            
            {/* Маршрут для страницы 404 */}
            <Route path="*" element={<Navigate to="/pages/error-404" replace />} />
        </ReactRoutes>
    );
};

export default Routes;