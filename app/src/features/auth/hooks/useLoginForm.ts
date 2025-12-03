import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import { useCredentialsAuth } from "./useCredentialsAuth";
import { useOtpAuth } from "./useOtpAuth";
import { usePasskeyAuth } from "./usePasskeyAuth";

export type LoginStep = 'INPUT_CREDENTIALS' | 'INPUT_OTP';

export const useLoginForm = () => {
    const [step, setStep] = useState<LoginStep>('INPUT_CREDENTIALS');
    const [showPasskeyModal, setShowPasskeyModal] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const navigate = useNavigate();

    // 認証成功時の遷移処理
    const handleSuccess = () => {
        navigate("/entry");
    };

    // パスキー登録モーダル表示
    const handlePasskeyPrompt = () => {
        setShowPasskeyModal(true);
    };

    // OTP入力画面への切り替え
    const handleOtpRequired = () => {
        setStep('INPUT_OTP');
    };

    // 各認証hookを初期化
    const credentialsAuth = useCredentialsAuth(handleOtpRequired);
    const otpAuth = useOtpAuth(handleSuccess, handlePasskeyPrompt);
    const passkeyAuth = usePasskeyAuth(handleSuccess);

    // 初期ロード時のセッションチェック
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

    // パスキーログイン（usernameを渡す）
    const handlePasskeyLogin = () => {
        passkeyAuth.handlePasskeyLogin(credentialsAuth.username);
    };

    // モーダル完了時の処理
    const handleModalComplete = () => {
        setShowPasskeyModal(false);
        navigate("/entry");
    };

    // エラーを統合（優先度: credentials > otp > passkey）
    const error = credentialsAuth.error || otpAuth.error || passkeyAuth.error;

    // ローディング状態を統合
    const isLoading = credentialsAuth.isLoading || otpAuth.isLoading || passkeyAuth.isLoading;

    return {
        // ステップ管理
        step,
        isCheckingSession,

        // Credentials
        username: credentialsAuth.username,
        setUsername: credentialsAuth.setUsername,
        password: credentialsAuth.password,
        setPassword: credentialsAuth.setPassword,
        handleLogin: credentialsAuth.handleLogin,

        // OTP
        otp: otpAuth.otp,
        setOtp: otpAuth.setOtp,
        handleVerifyOtp: otpAuth.handleVerifyOtp,

        // Passkey
        handlePasskeyLogin,
        showPasskeyModal,
        setShowPasskeyModal,
        handleModalComplete,

        // 共通
        isLoading,
        error
    };
};
