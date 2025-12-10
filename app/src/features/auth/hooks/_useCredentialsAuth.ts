import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";

type OnOtpRequired = () => void;

export const useCredentialsAuth = (onOtpRequired: OnOtpRequired) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            setError("メールアドレスとパスワードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { nextStep } = await signIn({
                username,
                password,
                options: {
                    authFlowType: "CUSTOM_WITH_SRP"
                }
            });

            // パスワード認証成功後、Custom Authフロー（OTP）へ遷移することを確認
            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                console.log("Password verified, OTP sent.");
                onOtpRequired();
            } else {
                // セキュリティ要件: OTPフロー以外の完了は認めない
                console.error("Unexpected step in Password Flow:", nextStep.signInStep);
                setError("認証エラー: 二要素認証がスキップされました。システム管理者に連絡してください。");
            }

        } catch (err: any) {
            console.error("Sign in failed:", err);
            // ★変更: 共通ユーティリティでメッセージ変換
            const message = getAuthErrorMessage(err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        error,
        handleLogin,
        clearError
    };
};