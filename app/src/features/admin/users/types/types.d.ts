export type User = {
    user_id: string;                    // Tableの key プロップスとして必須
    email: string;                      // 表示用
    family_name: string;                // 表示用
    given_name: string;                 // 表示用
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