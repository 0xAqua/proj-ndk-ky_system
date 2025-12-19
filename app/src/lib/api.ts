// src/lib/api.ts
import axios from 'axios';

// 共通のAxiosインスタンス作成
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true, // ★HttpOnly Cookie送受信を有効化
});

// ─────────────────────────────
// リクエストインターセプター
// BFF: トークンヘッダー不要
// ─────────────────────────────
api.interceptors.request.use(
    async (config) => {
        // HttpOnly Cookieがブラウザによって自動送信される
        return config;
    },
    (error) => Promise.reject(error)
);

// ─────────────────────────────
// レスポンスインターセプター
// ─────────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // 401 (認証切れ) の場合
        if (error.response?.status === 401) {
            console.warn("Session expired. Logging out...");

            try {
                // BFFのログアウトエンドポイントを呼ぶ
                await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/bff/auth/logout`,
                    {},
                    { withCredentials: true }
                );
            } catch (logoutError) {
                console.error('Logout failed', logoutError);
            }

            // ログイン画面にリダイレクト
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);