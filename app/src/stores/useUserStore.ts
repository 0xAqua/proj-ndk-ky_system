import { create } from 'zustand';

// 部署データの型（UIで使いやすい形に整形）
export interface Department {
    id: string;   // キー (例: "NETWORK")
    name: string; // 表示名 (例: "ネットワーク部")
}

// Storeの型定義
interface UserState {
    // 3つの基本情報
    tenantId: string | null;
    userId: string | null;
    departments: Department[];

    // ローディング状態
    isLoading: boolean;

    // アクション (データをセットする関数)
    setUserData: (apiResponse: any) => void;
    clearUser: () => void;
    setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
    // 初期値
    tenantId: null,
    userId: null,
    departments: [],
    isLoading: false,

    // API(s1) のレスポンスを受け取って Store に保存する
    setUserData: (data) => {
        // 1. 部署データの整形
        // APIからは { "COMMON": "共通", "NETWORK": "ネットワーク" } のようなMapで来る想定
        // これを [ { id: "COMMON", name: "共通" }, ... ] という配列に変換します
        const rawDepts = data.tenantUser?.departments || {};

        const formattedDepts: Department[] = Object.entries(rawDepts).map(([key, value]) => ({
            id: key,
            name: String(value) // 値が文字列であることを保証
        }));

        // 2. Stateの更新
        set({
            tenantId: data.tenantId,
            userId: data.userId,
            departments: formattedDepts,
        });
    },

    // ログアウト時などにリセットする
    clearUser: () => set({
        tenantId: null,
        userId: null,
        departments: []
    }),

    // ローディング切り替え
    setLoading: (loading) => set({ isLoading: loading }),
}));