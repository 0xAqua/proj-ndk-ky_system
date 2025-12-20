export interface UserInfo {
    tenantId: string;
    tenantUser: {
        departments: Record<string, string>; // { COMMON: '共通', ... } という形式
        role: 'admin' | 'user';
        status: string;
    };
    // 必要に応じて追加
    userId?: string;
    email?: string;
}

export interface SessionResponse {
    authenticated: boolean;
    user?: UserInfo;
}