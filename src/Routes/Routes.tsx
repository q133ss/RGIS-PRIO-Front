import React from 'react';
import { BrowserRouter, Route, Routes as ReactRoutes, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { routes, nonAuthRoutes } from './allRoutes';
// Импортируем компонент логина
import Login from '../pages/Pages/Login';

// Исключаем старый маршрут для LoginV2
const filteredNonAuthRoutes = nonAuthRoutes.filter(
    route => route.path !== '/pages/login-v2'
);

const Routes: React.FC = () => {
    return (
        <BrowserRouter>
            <ReactRoutes>
                {/* Перенаправление с главной страницы на логин */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Новый маршрут для компонента авторизации */}
                <Route path="/login" element={<Login />} />

                {/* Маршруты, не требующие авторизации */}
                {filteredNonAuthRoutes.map((route, index) => (
                    <Route key={index} path={route.path} element={route.component} />
                ))}

                {/* Защищенные маршруты (требующие авторизации) */}
                {/* Передаем пустой фрагмент как children, чтобы удовлетворить тип ProtectedRouteProps */}
                <Route element={<ProtectedRoute children={<></>} />}>
                    {routes.map((route, index) => (
                        <Route key={index} path={route.path} element={route.component} />
                    ))}
                </Route>

                {/* Маршрут для страницы 404 */}
                <Route path="*" element={<Navigate to="/pages/error-404" replace />} />
            </ReactRoutes>
        </BrowserRouter>
    );
};

export default Routes;