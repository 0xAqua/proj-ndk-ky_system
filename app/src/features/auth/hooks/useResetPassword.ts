// hooks/useResetPassword.ts
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/service/authService";

type Phase = "email" | "reset";

export const useResetPassword = () => {
    const navigate = useNavigate();

    // フェーズ管理
    const [phase, setPhase] = useState<Phase>("email");

    // フォーム値
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // 状態
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // バリデーション
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const isResetValid = otp.length === 6 && !!newPassword && !!confirmPassword && !passwordMismatch;

    // Step 1: メールアドレスを送信してOTPを発行
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidEmail) return;

        setIsLoading(true);
        setError(null);

        try {
            await authService.forgotPassword(email);
            setPhase("reset");
        } catch (err) {
            console.error(err);
            setError("確認コードの送信に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: OTP + 新パスワードでリセット
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isResetValid) return;

        setIsLoading(true);
        setError(null);

        try {
            await authService.resetPassword(email, otp, newPassword);
            navigate("/login", {
                state: { message: "パスワードを変更しました" }
            });
        } catch (err: any) {
            console.error(err);
            const errorCode = err?.response?.data?.error;
            switch (errorCode) {
                case "InvalidCode":
                    setError("確認コードが正しくありません");
                    break;
                case "CodeExpired":
                    setError("確認コードの有効期限が切れています");
                    break;
                case "InvalidPassword":
                    setError("パスワードの形式が正しくありません（8文字以上、大文字・小文字・数字を含む）");
                    break;
                case "LimitExceeded":
                    setError("試行回数の上限に達しました。しばらくお待ちください");
                    break;
                default:
                    setError("パスワードの変更に失敗しました");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // コード再送信
    const handleResendCode = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.forgotPassword(email);
            setError(null);
            // 成功メッセージを表示したい場合は別のstateで管理
        } catch (err) {
            console.error(err);
            setError("確認コードの再送信に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    // メールアドレス入力に戻る
    const handleBackToEmail = () => {
        setPhase("email");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
    };

    return {
        // フェーズ
        phase,

        // フォーム値
        email,
        setEmail,
        otp,
        setOtp,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,

        // 状態
        isLoading,
        error,

        // バリデーション
        isValidEmail,
        passwordMismatch,
        isResetValid,

        // アクション
        handleSendCode,
        handleResetPassword,
        handleResendCode,
        handleBackToEmail,
    };
};