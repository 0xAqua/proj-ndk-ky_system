import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import {
    authService,
    type SessionResponse
} from '@/lib/service/authService.ts';
import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";
import { bufferToBase64Url, parseRequestOptions } from "@/lib/utils/webauthn";
import type {AuthenticationCredentialJSON} from "@/lib/types/auth.ts";

// ログイン画面の表示ステップ
type LoginStep = 'INPUT_CREDENTIALS' | 'INPUT_OTP';

export const useLoginForm = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const credentialsAuth = useCredentialsAuth();

    // --- ステップ・状態管理 ---
    const [step, setStep] = useState<LoginStep>('INPUT_CREDENTIALS');
    const [otp, setOtp] = useState("");
    const [pendingKey, setPendingKey] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [resendMessage, setResendMessage] = useState("");

    // パスキー・認証関連
    const [isOtpLoading, setIsOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // プロモーションモーダルの表示管理
    const [isPromotionOpen, setIsPromotionOpen] = useState(false);

    // --- セッション・コンテキスト取得 ---
    const { data: session } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const { data: authContext } = useQuery({
        queryKey: ['authContext'],
        queryFn: authService.getAuthContext,
        enabled: !!session?.authenticated,
        staleTime: 60 * 60 * 1000,
    });

    // ロールに応じた画面遷移
    const navigateByRole = useCallback((role: string | undefined) => {
        setIsNavigating(true);
        if (role === "admin") {
            navigate("/admin/sample", { replace: true });
        } else {
            navigate("/entry", { replace: true });
        }
    }, [navigate]);

    // セッションが有効になったら自動遷移（ログイン済みの場合）
    useEffect(() => {
        if (session?.authenticated && authContext?.user?.role && !isPromotionOpen) {
            navigateByRole(authContext.user.role);
        }
    }, [session?.authenticated, authContext?.user?.role, navigateByRole, isPromotionOpen]);

    /**
     * ログイン成功後の共通処理
     * セッションを最新化し、パスキー未登録ならモーダルを表示、登録済みなら遷移する
     */
    const handleLoginSuccess = useCallback(async () => {
        // 1. React Queryのキャッシュを無効化してセッションを再取得
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        const sessionData = await authService.checkSession();

        // 2. パスキー登録状況を確認（BFF/Cognito側で判定された hasPasskey フラグを使用）
        if (sessionData.authenticated && !sessionData.user?.hasPasskey) {
            // 未登録なら登録を促すモーダルを表示
            setIsPromotionOpen(true);
        } else {
            // 登録済みなら本来の画面へ遷移
            navigateByRole(sessionData.user?.role);
        }
    }, [queryClient, navigateByRole]);

    // --- 各種アクション ---

    /**
     * 通常ログイン (ID/Password)
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError(null);
        setResendMessage("");

        const result = await credentialsAuth.handleLogin();

        if (result?.otpRequired) {
            // OTPステップへ
            setPendingKey(result.pendingKey || "");
            setMaskedEmail(result.maskedEmail || credentialsAuth.username);
            setStep('INPUT_OTP');
        } else if (result?.success) {
            // 成功時判定へ
            await handleLoginSuccess();
        }
    };

    /**
     * パスキーログイン実行
     */
    const handlePasskeyLogin = async () => {
        setIsOtpLoading(true);
        setOtpError(null);

        try {
            // 1. BFFからチャレンジ(Options)を取得
            const resp = await authService.getPasskeyOptions(credentialsAuth.username);

            // ★ CREDENTIAL_REQUEST_OPTIONS をパース
            const credentialOptions = JSON.parse(resp.public_challenge.CREDENTIAL_REQUEST_OPTIONS);

            // 2. バイナリ形式に変換
            const publicKeyOptions = parseRequestOptions(credentialOptions);

            // 3. ブラウザの生体認証プロンプトを起動
            const credential = await navigator.credentials.get({
                publicKey: publicKeyOptions
            }) as PublicKeyCredential;



            if (!credential) throw new Error("No credential returned");

            // 4. 認証結果をBFF送信用JSONに変換
            const response = credential.response as AuthenticatorAssertionResponse;
            const credentialForBff: AuthenticationCredentialJSON = {
                id: credential.id,
                rawId: bufferToBase64Url(credential.rawId),
                type: credential.type,
                response: {
                    authenticatorData: bufferToBase64Url(response.authenticatorData),
                    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
                    signature: bufferToBase64Url(response.signature),
                    userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null
                }
            };

            // 5. BFFで検証
            const result = await authService.verifyPasskey({
                username: credentialsAuth.username,
                credential: credentialForBff,
                cognito_session: resp.cognito_session
            });

            if (result.success) {
                // パスキーでログインした場合は既に登録済みなので、そのまま遷移
                await queryClient.invalidateQueries({ queryKey: ['session'] });
                const sessionData = await authService.checkSession();
                navigateByRole(sessionData.user?.role);
            } else {
                setOtpError("Passkey認証に失敗しました");
            }
        } catch (err: any) {
            console.error("Passkey error:", err);
            setOtpError("生体認証に失敗しました。パスワードでログインしてください。");
        } finally {
            setIsOtpLoading(false);
        }
    };

    /**
     * OTP検証
     */
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            setOtpError("6桁の認証コードを入力してください");
            return;
        }

        setIsOtpLoading(true);
        setOtpError(null);

        try {
            const result = await authService.verifyOtp(pendingKey, otp);
            if (result.success) {
                await handleLoginSuccess();
            } else if (result.retry && result.pending_key) {
                setPendingKey(result.pending_key);
                setOtp("");
                setOtpError("認証コードが正しくありません");
            } else {
                setOtpError("認証に失敗しました");
            }
        } catch (err: any) {
            const errorData = err.response?.data;
            const errorCode = errorData?.error || 'InvalidOTP';

            if (errorCode === 'SessionExpired') {
                setOtpError("有効期限が切れました。再度ログインしてください");
                handleBackToLogin();
            } else if (errorData?.retry && errorData?.pending_key) {
                setPendingKey(errorData.pending_key);
                setOtp("");
                setOtpError("認証コードが正しくありません");
            } else {
                setOtpError(getAuthErrorMessage({ code: errorCode }));
            }
        } finally {
            setIsOtpLoading(false);
        }
    };

    /**
     * OTP再送信
     */
    const handleResend = async () => {
        setIsOtpLoading(true);
        setOtpError(null);
        setResendMessage("");
        try {
            const result = await authService.resendOtp(pendingKey);
            setPendingKey(result.pending_key);
            setMaskedEmail(result.masked_email);
            setOtp("");
            setResendMessage("認証コードを再送信しました");
        } catch (err: any) {
            setOtpError("再送信に失敗しました");
        } finally {
            setIsOtpLoading(false);
        }
    };

    /**
     * ログイン画面へ戻る
     */
    const handleBackToLogin = useCallback(() => {
        setStep('INPUT_CREDENTIALS');
        setOtp("");
        setPendingKey("");
        setMaskedEmail("");
        setOtpError(null);
        setResendMessage("");
        credentialsAuth.clearPassword();
        credentialsAuth.clearError();
    }, [credentialsAuth]);

    /**
     * プロモーションモーダル完了時（登録完了またはスキップ）
     */
    const handlePromotionComplete = () => {
        setIsPromotionOpen(false);
        const user = queryClient.getQueryData<SessionResponse>(['session'])?.user;
        navigateByRole(user?.role);
    };

    return {
        // ステップ管理
        step,

        // 入力情報
        username: credentialsAuth.username,
        setUsername: credentialsAuth.setUsername,
        password: credentialsAuth.password,
        setPassword: credentialsAuth.setPassword,
        otp,
        setOtp,
        maskedEmail,

        // アクション
        handleLogin,
        handleVerifyOtp,
        handlePasskeyLogin,
        handleResend,
        handleBackToLogin,

        // パスキー・モーダル状態
        isPromotionOpen,
        setIsPromotionOpen,
        handlePromotionComplete,
        onPromotionComplete: handlePromotionComplete,

        // 共通状態
        isLoading: credentialsAuth.isLoading || isOtpLoading || isNavigating,
        error: step === 'INPUT_CREDENTIALS' ? credentialsAuth.error : otpError,
        resendMessage,
    };
};