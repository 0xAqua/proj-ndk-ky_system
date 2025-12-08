import { useState } from "react";
import { signIn } from "aws-amplify/auth";

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

            // ★修正ポイント: パスワード認証においては、ここに来る以外は全て異常とみなします
            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                console.log("Password verified, OTP sent.");
                onOtpRequired();
            } else {
                // DONE（OTPなしでログイン完了）などが返ってきたら、セキュリティ上のバグとして弾く
                console.error("Unexpected step in Password Flow:", nextStep.signInStep);
                setError("認証エラー: 二要素認証がスキップされました。システム管理者に連絡してください。");
            }

        } catch (err: any) {
            console.error("Sign in failed:", err);

            switch (err.name) {
                case "UserNotConfirmedException":
                    setError("メールアドレスの確認が完了していません。");
                    break;

                case "PasswordResetRequiredException":
                    setError("パスワードの変更が必要です。");
                    break;

                case "NotAuthorizedException":
                case "UserNotFoundException":
                    setError("メールアドレスまたはパスワードが間違っています。");
                    break;

                case "LimitExceededException":
                    setError("試行回数が上限を超えました。しばらく待ってから再度お試しください。");
                    break;

                default:
                    setError("ログインに失敗しました。ネットワーク状況などを確認してください。");
            }
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