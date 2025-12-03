import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, confirmSignIn, getCurrentUser } from "aws-amplify/auth";

// 画面のステップ管理用
export type LoginStep = 'INPUT_EMAIL' | 'INPUT_OTP';

export const useLoginForm = () => {
    // ステート
    const [step, setStep] = useState<LoginStep>('INPUT_EMAIL');
    const [username, setUsername] = useState("");
    const [otp, setOtp] = useState(""); // パスワードの代わりにOTP

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const navigate = useNavigate();

    // 1. 初期ロード時のセッションチェック
    useEffect(() => {
        const checkAuth = async () => {
            try {
                await getCurrentUser();
                console.log("Already logged in");
                navigate("/entry", { replace: true });
            } catch (err) {
                console.log("Not logged in");
            } finally {
                setIsCheckingSession(false);
            }
        };
        void checkAuth();
    }, [navigate]);

    // 2. メールアドレス送信処理 (Step 1)
    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) {
            setError("メールアドレスを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // カスタム認証フローを開始
            const { nextStep } = await signIn({
                username,
                password: "DUMMY_PASSWORD", // ★ここを追加！何でもOKです
                options: {
                    authFlowType: "CUSTOM_AUTH"
                }
            });

            // 次のステップが「カスタムチャレンジ（OTP入力）」ならOK
            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                setStep('INPUT_OTP'); // 画面をOTP入力へ切り替え
                console.log("OTP sent, waiting for input...");
            } else {
                setError("予期せぬログインステータスです: " + nextStep.signInStep);
            }
        } catch (err: any) {
            console.error("Sign in failed:", err);
            if (err.name === "UserNotFoundException") {
                setError("ユーザーが見つかりません。");
            } else {
                setError("メール送信に失敗しました。");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 3. OTP検証処理 (Step 2)
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) {
            setError("認証コードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // OTPを送信して検証
            const { isSignedIn } = await confirmSignIn({
                challengeResponse: otp
            });

            if (isSignedIn) {
                console.log("Login success");
                navigate("/entry");
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

    return {
        step,           // 今どっちの画面か
        username,
        setUsername,
        otp,            // パスワードの代わりに公開
        setOtp,
        isLoading,
        error,
        handleSendEmail, // メール送信ボタン用
        handleVerifyOtp, // OTP送信ボタン用
        isCheckingSession
    };
};