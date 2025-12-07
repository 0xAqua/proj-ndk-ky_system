import axios, {type InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// -------------------------------------------------------------
// 1. ベース設定 (共通のTimeoutやBaseURL)
// -------------------------------------------------------------
const baseConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // タイムアウト設定なども共通化
};

// -------------------------------------------------------------
// 2. Public API用 (認証不要・テナントID不要・最速)
// -------------------------------------------------------------
export const publicApi = axios.create(baseConfig);

// -------------------------------------------------------------
// 3. Tenant API用 (認証必須・テナントID付与)
// -------------------------------------------------------------
export const tenantApi = axios.create(baseConfig);

// テナントAPI用のリクエストインターセプター
tenantApi.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            // Amplifyからセッションを取得 (Amplifyはトークンをメモリキャッシュするため、頻繁に呼んでも低速化の心配は少ないです)
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            // JWTからテナントIDを取得 (Amplifyのカスタム属性に入っている前提)
            const payload = session.tokens?.idToken?.payload;
            const tenantId = payload?.['custom:tenant_id'] as string | undefined;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Terraformで `PER_TENANT` モードにしたため、ヘッダーで明示的に渡す
            // (バックエンドがJWT解析だけで判断するなら不要ですが、ログやルーティングで使う場合はヘッダーが有効です)
            if (tenantId) {
                config.headers['X-Tenant-ID'] = tenantId;
            }

        } catch (error) {
            console.error('Auth/Tenant session fetch failed', error);
            // 認証エラー時はリクエストを止めるか、そのまま流して401にするか判断
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// -------------------------------------------------------------
// 4. 共通レスポンス処理 (401ハンドリングなど)
// -------------------------------------------------------------
const handleResponseError = async (error: any) => {
    if (error.response?.status === 401) {
        console.warn("Session expired. Redirecting...");
        const { signOut } = await import('aws-amplify/auth');
        await signOut();
        window.location.href = '/login';
    }
    return Promise.reject(error);
};

// 両方のインスタンスにエラーハンドリングを適用
publicApi.interceptors.response.use((res) => res, handleResponseError);
tenantApi.interceptors.response.use((res) => res, handleResponseError);

// デフォルトエクスポートは廃止するか、よく使う方(tenantApi)にする
export default tenantApi;