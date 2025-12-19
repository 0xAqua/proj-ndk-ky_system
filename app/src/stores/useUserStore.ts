import {create} from 'zustand';

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
        // オプショナルチェイニングで安全に取得
        const nestedDepts = data?.tenantUser?.departments;

        // nestedDepts が null/undefined の場合は {} を使用する
        const formattedDepts: Department[] = Object.entries(nestedDepts ?? {}).map(([key, value]) => ({
            id: key,
            name: String(value)
        }));

        set({
            tenantId: data?.tenantId,
            userId: data?.userId,
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