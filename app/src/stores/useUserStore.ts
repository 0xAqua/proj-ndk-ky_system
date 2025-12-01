import { create } from 'zustand';

// DynamoDB (s1) から返ってくるデータの型定義
// ※ tenant_user_master_seed.json の構造に合わせます
export interface TenantUser {
    tenant_id: string;
    user_id: string;
    tenant_name: string;
    departments: Record<string, { S: string }>; // DynamoDBのJSON構造に合わせて調整
    // 実際はAPI側で整形しているなら { code: string, name: string }[] 等になりますが
    // 一旦受け取れる緩い型にしておきます
}

interface UserState {
    tenantId: string | null;
    userId: string | null;
    tenantUser: TenantUser | null; // 詳細情報（部署など）
    isLoading: boolean;

    // アクション
    setUserData: (data: { tenantId: string; userId: string; tenantUser: TenantUser }) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
    tenantId: null,
    userId: null,
    tenantUser: null,
    isLoading: false,

    setUserData: (data) => set({
        tenantId: data.tenantId,
        userId: data.userId,
        tenantUser: data.tenantUser
    }),

    clearUser: () => set({ tenantId: null, userId: null, tenantUser: null }),
    setLoading: (loading) => set({ isLoading: loading }),
}));