import { useState } from "react";
import { authService, type LoginResponse } from '@/lib/service/authService.ts';
import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";

export interface CredentialsAuthResult {
    success: boolean;
    otpRequired?: boolean;
    passkeyRequired?: boolean;
    pendingKey?: string;
    maskedEmail?: string;
}

export const useCredentialsAuth = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (): Promise<CredentialsAuthResult> => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            setError("メールアドレスとパスワードを入力してください。");
            return { success: false };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedUsername)) {
            setError("有効なメールアドレスを入力してください。");
            return { success: false };
        }

        setIsLoading(true);
        setError(null);

        try {
            const result: LoginResponse = await authService.login(trimmedUsername, trimmedPassword);

            // OTP必要な場合
            if (result.otp_required) {
                return {
                    success: false,
                    otpRequired: true,
                    passkeyRequired: result.passkey_required, // ここでフラグを渡す
                    pendingKey: result.pending_key,
                    maskedEmail: result.masked_email,
                };
            }

            // 通常ログイン成功
            setPassword("");
            return { success: true };

        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { error?: string } } };
            const errorCode = axiosError.response?.data?.error;
            const message = getAuthErrorMessage({
                code: errorCode || 'DefaultError'
            });
            setError(message);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);
    const clearPassword = () => setPassword("");

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        error,
        setError,
        handleLogin,
        clearError,
        clearPassword,
    };
};