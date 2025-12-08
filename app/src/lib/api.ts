
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// 共通のAxiosインスタンス作成
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// リクエストインターセプター: 通信の直前に割り込んでトークンをセットする
api.interceptors.request.use(
    async (config) => {
        try {
            // Amplifyから最新のセッションを取得
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;

                // (任意) 将来のテナント分離のためにヘッダーにも入れておく
                // const tenantId = session.tokens?.idToken?.payload['custom:tenant_id'];
                // if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
            }
        } catch (error) {
            console.error('Failed to get auth token', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// レスポンスインターセプター: エラー時の共通処理
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // 401 (認証切れ) の場合
        if (error.response?.status === 401) {
            console.warn("Session expired. Logging out...");

            // 1. Cognitoからサインアウト
            const { signOut } = await import('aws-amplify/auth');
            await signOut();

            // 2. Storeをクリア (循環参照を避けるため、直接importせずにwindow.location等でリロードさせるのが一番確実ですが、今回はStoreを呼ぶ)
            // ※ ここでStoreを呼ぶと依存関係が複雑になるので、
            //    一番簡単なのは「強制リロード」してログイン画面に戻すことです。
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);