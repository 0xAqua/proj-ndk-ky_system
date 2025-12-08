import { create } from 'zustand';

export interface Department {
    id: string;
    name: string;
}

interface UserState {
    tenantId: string | null;
    userId: string | null;
    departments: Department[];
    isLoading: boolean;

    setUserData: (apiResponse: any) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
    tenantId: null,
    userId: null,
    departments: [],
    isLoading: false,

    setUserData: (data) => {
        // データ構造のチェック
        const directDepts = data.departments;
        const nestedDepts = data.tenantUser?.departments;

        console.log("Check data.departments:", directDepts);
        console.log("Check data.tenantUser.departments:", nestedDepts);

        // データの取得（優先順位: 直下 > tenantUser配下 > 空）
        const rawDepts = directDepts || nestedDepts || {};

        const formattedDepts: Department[] = Object.entries(rawDepts).map(([key, value]) => ({
            id: key,
            name: String(value)
        }));

        set({
            // snake_case対応: tenant_id が来ても tenantId に入れる
            tenantId: data.tenant_id || data.tenantId,
            userId: data.user_id || data.userId,
            departments: formattedDepts,
        });
    },

    clearUser: () => set({
        tenantId: null,
        userId: null,
        departments: []
    }),

    setLoading: (loading) => set({ isLoading: loading }),
}));