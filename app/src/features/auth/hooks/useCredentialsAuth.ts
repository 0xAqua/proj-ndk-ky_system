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

            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                onOtpRequired();
                console.log("Password verified, OTP sent.");
            } else {
                console.error("Unexpected step:", nextStep.signInStep);
                setError("予期せぬログインステータスです。");
            }
        } catch (err: any) {
            console.error("Sign in failed:", err);
            if (err.name === "NotAuthorizedException") {
                setError("メールアドレスまたはパスワードが間違っています。");
            } else if (err.name === "UserNotFoundException") {
                setError("ユーザーが見つかりません。");
            } else {
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
