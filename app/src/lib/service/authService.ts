import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';
import type {
    WebAuthnCreationOptionsJSON,
    AuthenticationCredentialJSON,
    RegistrationCredentialJSON
} from '../types/auth';

/**
 * ユーザー情報の型定義
 */
export interface UserInfo {
    email: string;
    tenant_id: string;
    role: string;
    hasPasskey?: boolean; // ★パスキー登録済みかどうかのフラグ
    tenant_user?: {
        departments: Record<string, string>;
        role: string;
        status: string;
    };
    tenantUser?: {
        departments: Record<string, string>;
        role: string;
        status: string;
    };
}

/**
 * レスポンス関連の型定義
 */
export interface SessionResponse {
    authenticated: boolean;
    user?: UserInfo;
}

export interface LoginResponse {
    success?: boolean;
    otp_required?: boolean;
    passkey_required?: boolean;
    pending_key?: string;
    masked_email?: string;
}

export interface VerifyOtpResponse {
    success?: boolean;
    error?: string;
    retry?: boolean;
    pending_key?: string;
}

export interface ResendOtpResponse {
    success: boolean;
    pending_key: string;
    masked_email: string;
}

export interface PasskeyVerifyResponse {
    success: boolean;
    error?: string;
}

/**
 * 認証サービス
 */
export const authService = {
    /**
     * ログイン (ID/Password)
     */
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const { data } = await api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, { username, password });
        return data;
    },

    /**
     * OTP検証
     */
    verifyOtp: async (pendingKey: string, otpCode: string): Promise<VerifyOtpResponse> => {
        const { data } = await api.post<VerifyOtpResponse>(ENDPOINTS.AUTH.VERIFY_OTP, {
            pending_key: pendingKey,
            otp_code: otpCode,
        });
        return data;
    },

    /**
     * OTP再送信
     */
    resendOtp: async (pendingKey: string): Promise<ResendOtpResponse> => {
        const { data } = await api.post<ResendOtpResponse>(ENDPOINTS.AUTH.RESEND_OTP, {
            pending_key: pendingKey,
        });
        return data;
    },

    /**
     * ログアウト
     */
    logout: async () => {
        const { data } = await api.post(ENDPOINTS.AUTH.LOGOUT);
        return data;
    },

    /**
     * セッション確認
     */
    checkSession: async (): Promise<SessionResponse> => {
        const { data } = await api.get<SessionResponse>(ENDPOINTS.AUTH.SESSION);
        return data;
    },

    /**
     * トークンリフレッシュ
     */
    refresh: async () => {
        const { data } = await api.post(ENDPOINTS.AUTH.REFRESH);
        return data;
    },

    /**
     * 認証コンテキスト取得
     */
    getAuthContext: async () => {
        const response = await api.get(ENDPOINTS.AUTH_CONTEXT);
        return response.data;
    },

    /** * Passkey認証用のオプション取得 (ログイン用)
     */
    getPasskeyOptions: async (username: string): Promise<{
        public_challenge: {
            CREDENTIAL_REQUEST_OPTIONS: string;  // JSON文字列
        };
        cognito_session: string;
    }> => {
        const { data } = await api.post(ENDPOINTS.AUTH.PASSKEY_OPTIONS, { username });
        return data;
    },
    /** * Passkey認証の検証 (ログイン用)
     */
    verifyPasskey: async (params: {
        username: string;
        credential: AuthenticationCredentialJSON;
        cognito_session: string;
    }): Promise<PasskeyVerifyResponse> => {
        const { data } = await api.post<PasskeyVerifyResponse>(ENDPOINTS.AUTH.PASSKEY_VERIFY, params);
        return data;
    },

    /** * Passkey登録用のオプション取得 (デバイス登録用)
     */
    getPasskeyRegisterOptions: async (): Promise<{
        status: string;
        creation_options: WebAuthnCreationOptionsJSON;
    }> => {
        const { data } = await api.post(ENDPOINTS.AUTH.PASSKEY_REGISTER_OPTIONS);
        return data;
    },

    /** * Passkey登録の検証 (デバイス登録用)
     */
    verifyPasskeyRegister: async (params: {
        credential: RegistrationCredentialJSON;
    }): Promise<{ success: boolean }> => {
        const { data } = await api.post<{ success: boolean }>(ENDPOINTS.AUTH.PASSKEY_REGISTER_VERIFY, params);
        return data;
    },

    /**
     * パスワードリセット用コード送信
     */
    forgotPassword: async (email: string): Promise<{ success: boolean; masked_email: string }> => {
        const { data } = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
        return data;
    },

    /**
     * パスワードリセット実行
     */
    resetPassword: async (email: string, code: string, newPassword: string): Promise<{ success: boolean }> => {
        const { data } = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
            email,
            code,
            new_password: newPassword,
        });
        return data;
    },
};