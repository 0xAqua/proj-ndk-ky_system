import { useState } from "react";
import { signIn } from "aws-amplify/auth";

type OnSuccess = () => void;

export const usePasskeyAuth = (onSuccess: OnSuccess) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePasskeyLogin = async (username: string) => {
        if (!username) {
            setError("メールアドレスを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { isSignedIn, nextStep } = await signIn({
                username,
                options: {
                    authFlowType: 'USER_AUTH',
                    preferredChallenge: 'WEB_AUTHN'
                }
            });

            if (isSignedIn) {
                onSuccess();
            } else {
                console.log("Next Step:", nextStep);
            }
        } catch (err: any) {
            console.error("Passkey login failed:", err);
            setError("パスキー認証に失敗しました。登録されていないか、ブラウザが対応していません。");
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        isLoading,
        error,
        handlePasskeyLogin,
        clearError
    };
};
