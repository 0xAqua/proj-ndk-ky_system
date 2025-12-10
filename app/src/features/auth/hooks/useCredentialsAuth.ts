import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";

export const useCredentialsAuth = () => {
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
            // ★変更1: authFlowType: "CUSTOM_WITH_SRP" を削除
            // これにより標準のパスワード認証 (USER_SRP_AUTH) が行われます
            const { nextStep } = await signIn({
                username,
                password,
            });

            // ★変更2: パスワードだけで完了 (DONE) した場合を成功とする
            if (nextStep.signInStep === 'DONE') {
                console.log("Login successful.");
                // AmplifyのAuth状態が更新されるため、
                // アプリケーション側（App.tsxなど）でログイン状態を検知して画面遷移します。

                // 明示的にリロードが必要な構成ならここで行いますが、通常はそのままでOK
                window.location.href = "/";
            }
            // もし何らかの理由でMFAが要求された場合のハンドリング
            else if (
                nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE' ||
                nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' ||
                nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
            ) {
                console.warn("MFA required but UI is hidden.");
                setError("MFA設定が有効になっていますが、現在のログイン画面は対応していません。管理者に連絡してください。");
            } else {
                console.error("Unexpected step:", nextStep.signInStep);
                setError("予期せぬログインステータスです。");
            }

        } catch (err: any) {
            console.error("Sign in failed:", err);
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