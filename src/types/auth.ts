// Общий интерфейс пользователя для авторизации
export interface User {
    id: number;
    created_at?: string;
    updated_at?: string;
    org_id?: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    phone: string;
    login: string;
    role_id: number;
    role?: {
      id: number;
      name: string;
      slug: string;
      created_at?: string;
      updated_at?: string;
    };
    // Дополнительные поля для совместимости с типом из multiApartmentBuilding
    name?: string;
    email?: string;
  }
  
  // Общий интерфейс ответа авторизации
  export interface AuthResponse {
    token: string;
    user: User;
    message?: string;
  }