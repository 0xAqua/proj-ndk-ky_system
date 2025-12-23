import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';

// セッション情報の型を定義
export interface UserInfo {
    email: string;      // ← 識別子
    tenant_id: string;
    role: string;
    // tenant_user 情報（/me エンドポイントから取得）
    tenant_user?: {
        departments: Record<string, string>;
        role: string;
        status: string;
    };
    // camelCase 対応（念のため）
    tenantUser?: {
        departments: Record<string, string>;
        role: string;
        status: string;
    };
}

export interface SessionResponse {
    authenticated: boolean;
    user?: UserInfo;
}

export const authService = {
    login: async (username: string, password: string) => {
        const { data } = await api.post(ENDPOINTS.AUTH.LOGIN, { username, password });
        return data;
    },

    logout: async () => {
        const { data } = await api.post(ENDPOINTS.AUTH.LOGOUT);
        return data;
    },

    checkSession: async (): Promise<SessionResponse> => {
        const { data } = await api.get<SessionResponse>(ENDPOINTS.AUTH.SESSION);
        return data;
    },

    refresh: async () => {
        const { data } = await api.post(ENDPOINTS.AUTH.REFRESH);
        return data;
    },

    getAuthContext: async () => {
        const response = await api.get(ENDPOINTS.AUTH_CONTEXT);
        return response.data;
    },
};