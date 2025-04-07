// Определяем API_URL и getToken прямо здесь
const API_URL = import.meta.env.VITE_API_URL;

// Функция для получения токена
const getToken = (): string | null => {
    return localStorage.getItem("token");
};

// Интерфейс для запросов
interface RequestOptions extends RequestInit {
    authRequired?: boolean;
}

// Базовый класс для выполнения HTTP запросов
class HttpService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // Приватный метод для формирования заголовков
    private getHeaders(authRequired: boolean = true): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (authRequired) {
            const token = getToken();
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // GET запрос
    async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
        const { authRequired = true, ...restOptions } = options;
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: "GET",
            headers: this.getHeaders(authRequired),
            ...restOptions
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as T;
    }

    // POST запрос
    async post<T>(url: string, data: any, options: RequestOptions = {}): Promise<T> {
        const { authRequired = true, ...restOptions } = options;
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: "POST",
            headers: this.getHeaders(authRequired),
            body: JSON.stringify(data),
            ...restOptions
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as T;
    }

    // PUT запрос
    async put<T>(url: string, data: any, options: RequestOptions = {}): Promise<T> {
        const { authRequired = true, ...restOptions } = options;
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: "PUT",
            headers: this.getHeaders(authRequired),
            body: JSON.stringify(data),
            ...restOptions
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as T;
    }

    // DELETE запрос
    async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
        const { authRequired = true, ...restOptions } = options;
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            method: "DELETE",
            headers: this.getHeaders(authRequired),
            ...restOptions
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as T;
    }
}

// Создаем и экспортируем экземпляр сервиса
export const httpService = new HttpService(API_URL);