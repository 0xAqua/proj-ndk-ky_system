import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, confirmSignIn, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

// 画面のステップ管理用
export type LoginStep = 'INPUT_CREDENTIALS' | 'INPUT_OTP';

export const useLoginForm = () => {
    // ステート管理
    const [step, setStep] = useState<LoginStep>('INPUT_CREDENTIALS');
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");

    // モーダル表示用
    const [showPasskeyModal, setShowPasskeyModal] = useState(false);

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

    // 2. ログイン処理 (Step 1: ID/PASS認証)
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            setError("メールアドレスとパスワードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // パスワード認証 + カスタムフローを開始
            const { nextStep } = await signIn({
                username,
                password,
                options: {
                    // "CUSTOM_WITH_SRP" = パスワード認証後にLambdaへバトンタッチ
                    authFlowType: "CUSTOM_WITH_SRP"
                }
            });

            // パスワードが合っていれば、LambdaがOTPを発行してこのステータスになる
            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                setStep('INPUT_OTP'); // 画面をOTP入力へ切り替え
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

    // 3. OTP検証処理 (Step 2: OTP認証)
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

                // ★追加: パスキー登録済みかチェック
                try {
                    const attributes = await fetchUserAttributes();
                    // "1" じゃなければ未登録とみなしてモーダルを表示
                    if (attributes["custom:has_passkey"] !== "1") {
                        setShowPasskeyModal(true);
                        return; // ここで中断し、遷移はモーダル操作後に任せる
                    }
                } catch (attrError) {
                    console.warn("属性取得失敗:", attrError);
                    // エラー時は安全側に倒してそのまま遷移させるか、モーダルを出すか選べますが、今回は遷移させます
                }

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

    // 4. パスキーログイン処理
    const handlePasskeyLogin = async () => {
        // ユーザー名が入力されていない場合はエラーにする（Passkey認証にはユーザーの特定が必要）
        if (!username) {
            setError("メールアドレスを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Passkey (User Auth) フローを開始
            const { isSignedIn, nextStep } = await signIn({
                username,
                options: {
                    authFlowType: 'USER_AUTH',
                    preferredChallenge: 'WEB_AUTHN'
                }
            });

            if (isSignedIn) {
                navigate("/entry");
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

    // 5. モーダル完了時の処理（「いいえ」や登録完了後に呼ぶ）
    const handleModalComplete = () => {
        setShowPasskeyModal(false);
        navigate("/entry");
    };

    return {
        step,
        username, setUsername,
        password, setPassword,
        otp, setOtp,
        isLoading,
        error,
        handleLogin,    // Step 1用
        handleVerifyOtp, // Step 2用
        isCheckingSession,

        // パスキー関連
        showPasskeyModal,
        setShowPasskeyModal,
        handlePasskeyLogin,
        handleModalComplete
    };
};