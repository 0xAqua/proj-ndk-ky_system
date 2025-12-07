// src/features/auth/hooks/useLoginForm.ts

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
// ★追加: React Query関連
import { useQueryClient } from "@tanstack/react-query";
import { fetchConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { useOtpAuth } from "./useOtpAuth";
import { usePasskeyAuth } from "./usePasskeyAuth";

export type LoginStep = 'INPUT_CREDENTIALS' | 'INPUT_OTP';

export const useLoginForm = () => {
    const [step, setStep] = useState<LoginStep>('INPUT_CREDENTIALS');
    const [showPasskeyModal, setShowPasskeyModal] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const navigate = useNavigate();
    // ★追加: QueryClientの取得
    const queryClient = useQueryClient();

    // ★追加: マスタデータのプリフェッチ関数
    // 画面遷移前にこれを呼ぶことで、次の画面のロード時間を短縮します
    const prefetchMasterData = () => {
        void queryClient.prefetchQuery({
            queryKey: ['constructionMaster'],
            queryFn: fetchConstructionMaster,
            staleTime: 1000 * 60 * 60, // 1時間はキャッシュ有効
        });
    };

    // 認証成功時の遷移処理
    const handleSuccess = () => {
        // ★追加: 遷移前にデータ取得を開始（awaitしないのがポイント）
        prefetchMasterData();
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
                // ★追加: ログイン済みの場合も遷移前に取得開始
                prefetchMasterData();
                navigate("/entry", { replace: true });
            } catch (err) {
                console.log("Not logged in");
            } finally {
                setIsCheckingSession(false);
            }
        };
        void checkAuth();
    }, [navigate]); // queryClientは安定しているため依存配列に入れなくてもOKですが、入れても問題ありません

    // パスキーログイン（usernameを渡す）
    const handlePasskeyLogin = () => {
        passkeyAuth.handlePasskeyLogin(credentialsAuth.username);
    };

    // モーダル完了時の処理
    const handleModalComplete = () => {
        setShowPasskeyModal(false);
        // ★追加: ここでも念のため取得開始
        prefetchMasterData();
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