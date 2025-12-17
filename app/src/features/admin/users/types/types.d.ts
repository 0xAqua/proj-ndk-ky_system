export interface User {
    tenant_id: string;
    user_id: string;
    email: string;
    family_name: string;
    given_name: string;
    departments: Record<string, string>;  // { "COMMON": "共通", "ACCESS": "アクセス" }
    role: "admin" | "user";
    status: "ACTIVE" | "INACTIVE" | "LOCKED";
    created_at: string;
    updated_at: string;
}

export interface UsersResponse {
    users: User[];
    count: number;
}

export interface CreateUserInput {
    email: string;
    password: string;
    family_name: string;
    given_name: string;
    departments?: Record<string, string>;
    role?: "admin" | "user";
}

export interface UpdateUserInput {
    family_name?: string;
    given_name?: string;
    departments?: Record<string, string>;
    role?: "admin" | "user";
    status?: "ACTIVE" | "INACTIVE" | "LOCKED";
}