import { create } from 'zustand';

export interface Department {
    id: string;
    name: string;
}

// ① APIレスポンスの型を定義（any を避ける）
interface UserApiResponse {
    tenantId: string;
    userId: string;
    tenantUser: {
        departments: Record<string, string>;
    };
}

interface UserState {
    tenantId: string | null;
    userId: string | null;
    departments: Department[];
    isLoading: boolean;

    setUserData: (apiResponse: UserApiResponse) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
    tenantId: null,
    userId: null,
    departments: [],
    isLoading: false,

    setUserData: (data) => {
        const nestedDepts = data?.tenantUser?.departments;

        const formattedDepts: Department[] = Object.entries(nestedDepts ?? {}).map(([key, value]) => ({
            id: key,
            name: String(value)
        }));

        set({
            tenantId: data?.tenantId ?? null,
            userId: data?.userId ?? null,
            departments: formattedDepts,
        });
    },

    // ② isLoading もリセット
    clearUser: () => set({
        tenantId: null,
        userId: null,
        departments: [],
        isLoading: false,
    }),

    setLoading: (loading) => set({ isLoading: loading }),
}));