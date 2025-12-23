export type User = {
    email: string;                      // 表示用
    departments: Record<string, string>;// 表示用（Map形式: { "CODE": "名称" }）
    role: "admin" | "user";             // Badgeの色分け・ラベル用
    status: "ACTIVE" | "INACTIVE" | "LOCKED"; // Badgeの色分け・ラベル用
    last_login_at?: string;             // 「未ログイン」判定と表示用
};

export interface UsersResponse {
    users: User[];
    count: number;
}

export interface CreateUserInput {
    email: string;
    password: string;
    departments?: Record<string, string>;
    role?: "admin" | "user";
}

export interface UpdateUserInput {
    departments?: Record<string, string>;
    role?: "admin" | "user";
    status?: "ACTIVE" | "INACTIVE" | "LOCKED";
}