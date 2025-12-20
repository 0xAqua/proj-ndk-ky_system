import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';

// セッション情報の型を定義（セキュリティと開発効率のため）
export interface UserInfo {
    id: string;
    tenant_id: string; // ログに合わせて修正
    role: string;      // ログに合わせて修正
    email: string;
    family_name?: string;
    given_name?: string;
    // 恐らくネスト部分も snake_case になっている可能性が高いです
    tenant_user?: {
        departments: Record<string, string>;
    };
    // 万が一 camelCase で送られてくる場合の両対応
    tenantUser?: {
        departments: Record<string, string>;
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

    getMe: async () => {
        const { data } = await api.get(ENDPOINTS.ME);
        return data; // { tenantId, tenantUser: { departments... } }
    }
};