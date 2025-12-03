import { useState } from "react";
import { confirmSignIn, fetchUserAttributes } from "aws-amplify/auth";

type OnSuccess = () => void;
type OnPasskeyPrompt = () => void;

export const useOtpAuth = (onSuccess: OnSuccess, onPasskeyPrompt: OnPasskeyPrompt) => {
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otp) {
            setError("認証コードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { isSignedIn } = await confirmSignIn({
                challengeResponse: otp
            });

            if (isSignedIn) {
                console.log("Login success");

                // パスキー登録済みかチェック
                try {
                    const attributes = await fetchUserAttributes();
                    if (attributes["custom:has_passkey"] !== "1") {
                        onPasskeyPrompt();
                        return;
                    }
                } catch (attrError) {
                    console.warn("属性取得失敗:", attrError);
                }

                onSuccess();
            } else {
                setError("認証が完了しませんでした。もう一度お試しください。");
            }
        } catch (err: any) {
            console.error("OTP verification failed:", err);
            setError("認証コードが間違っているか、有効期限切れです。");
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);
    const resetOtp = () => setOtp("");

    return {
        otp,
        setOtp,
        isLoading,
        error,
        handleVerifyOtp,
        clearError,
        resetOtp
    };
};
