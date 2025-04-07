// Базовый URL API
const API_URL = import.meta.env.VITE_API_URL;

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    login: string;
    phone: string;
    role_id: number;
    role: {
        id: number;
        name: string;
        slug: string;
    };
}

export interface LoginResponse {
    user: User;
    token: string;
}

// Функция для проверки авторизации пользователя
export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem("token");
    return !!token;
};

// Функция для получения текущего пользователя
export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr) as User;
    } catch (e) {
        return null;
    }
};

// Функция для получения токена
export const getToken = (): string | null => {
    return localStorage.getItem("token");
};

// Функция для входа в систему
export const login = async (login: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ login, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Произошла ошибка при авторизации");
    }

    // Сохраняем данные в localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data as LoginResponse;
};

// Функция для выхода из системы
export const logout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};