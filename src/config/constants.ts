// URL бэкенда для API запросов
export const API_URL = import.meta.env.VITE_API_URL || "https://pink-masters.store/api";

// Время жизни токена в миллисекундах (если нужно для автоматического выхода)
export const TOKEN_EXPIRATION = 3600000; // 1 час