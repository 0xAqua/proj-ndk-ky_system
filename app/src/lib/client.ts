import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ENDPOINTS } from '@/lib/endpoints';

// ================================================================
// 設定
// ================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// リフレッシュ試行を除外するパス（ENDPOINTSから生成）
const AUTH_PATHS = Object.values(ENDPOINTS.AUTH);

// ================================================================
// Axiosインスタンス作成
// ================================================================

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        // CSRF対策: サーバー側でこのヘッダーを検証する
        'X-Requested-With': 'XMLHttpRequest',
    },
    // HttpOnly Cookie送信に必須
    withCredentials: true,
    // タイムアウト設定（無限待機防止）
    timeout: 30000,
});

// ================================================================
// トークンリフレッシュ管理
// ================================================================

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

/**
 * リフレッシュ完了を待機しているリクエストに通知
 */
const onRefreshComplete = (success: boolean) => {
    refreshSubscribers.forEach((callback) => callback(success));
    refreshSubscribers = [];
};

/**
 * リフレッシュ完了を待機
 */
const waitForRefresh = (): Promise<boolean> => {
    return new Promise((resolve) => {
        refreshSubscribers.push(resolve);
    });
};

/**
 * トークンリフレッシュ実行
 */
const refreshToken = async (): Promise<boolean> => {
    try {
        await api.post(ENDPOINTS.AUTH.REFRESH);
        return true;
    } catch {
        return false;
    }
};

// ================================================================
// レスポンスインターセプター
// ================================================================

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // 設定がない場合はそのままエラーを返す
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // 401エラー以外はそのまま返す
        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // 認証系APIは除外（無限ループ防止）
        const isAuthPath = AUTH_PATHS.some((path) =>
            originalRequest.url?.includes(path)
        );
        if (isAuthPath) {
            return Promise.reject(error);
        }

        // 既にリトライ済みの場合はログアウト
        if (originalRequest._retry) {
            await forceLogout();
            return Promise.reject(error);
        }

        // リフレッシュ中の場合は完了を待機
        if (isRefreshing) {
            const success = await waitForRefresh();
            if (success) {
                return api(originalRequest);
            }
            return Promise.reject(error);
        }

        // リフレッシュ開始
        isRefreshing = true;
        originalRequest._retry = true;

        try {
            const success = await refreshToken();

            if (success) {
                onRefreshComplete(true);
                return api(originalRequest);
            }

            onRefreshComplete(false);
            await forceLogout();
            return Promise.reject(error);
        } catch {
            onRefreshComplete(false);
            await forceLogout();
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }
);

// ================================================================
// 強制ログアウト
// ================================================================

let isLoggingOut = false;

/**
 * 強制ログアウト（二重実行防止付き）
 */
const forceLogout = async (): Promise<void> => {
    // 二重実行防止
    if (isLoggingOut) return;
    isLoggingOut = true;

    try {
        // サーバー側のセッションを無効化
        await api.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
        // ログアウトAPI失敗は無視（既にセッション切れの可能性）
    }

    // 現在のURLを保持してリダイレクト
    const currentPath = window.location.pathname;
    const returnUrl = encodeURIComponent(currentPath);
    window.location.href = `/login?returnUrl=${returnUrl}`;
};

// ================================================================
// エクスポート
// ================================================================

export default api;