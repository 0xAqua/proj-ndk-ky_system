import { VStack, Text, Image, Link } from "@chakra-ui/react";
import logo from '@/assets/logo.jpg';
import { useState } from "react"; // 追加
import { useLoginForm } from "./hooks/useLoginForm";
import { CredentialsForm } from "./components/CredentialsForm";
import { OtpForm } from "./components/OtpForm";
import { EnvBadge } from "@/components/elements/EnvBadge";
import { PasskeyLoginButton } from "@/features/auth/components/PasskeyLoginButton";
import { PasskeyPromotionModal } from "@/features/auth/components/PasskeyPromotionModal";

export const LoginForm = () => {
    const {
        step,
        username,
        setUsername,
        password,
        setPassword,
        otp,
        setOtp,
        maskedEmail,
        handleLogin,
        handleVerifyOtp,
        handlePasskeyLogin,
        handleResend,
        handleBackToLogin,
        isLoading,
        error,
        resendMessage,
        isPromotionOpen,
        onPromotionComplete,
        setIsPromotionOpen,
    } = useLoginForm();

    // メールとパスワードの画面分けを管理するローカルステート
    const [authPhase, setAuthPhase] = useState<'email' | 'password'>('email');

    // 画面切り替えのタイトル制御
    const getTitle = () => {
        if (step === 'INPUT_OTP') return '認証コード入力';
        return authPhase === 'email' ? 'ログイン' : 'パスワード入力';
    };

    return (
        <VStack gap={6} width="100%">
            <Image src={logo} alt="KY System logo" width="78px" mt="4" />

            <VStack>
                <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                    {getTitle()}
                </Text>
                <EnvBadge />
            </VStack>

            <VStack gap={1} mb="4">
                <Text fontSize="sm" color="gray.600" textAlign="center">
                    {step === 'INPUT_OTP'
                        ? '認証コードを入力してください'
                        : (authPhase === 'email'
                            ? '危険予知システムへようこそ'
                            : 'ログイン情報を入力してください')}
                </Text>
            </VStack>

            {/* エラー表示 */}
            {error && (
                <Text color="red.500" fontSize="sm" textAlign="center" fontWeight="bold">
                    {error}
                </Text>
            )}

            {/* 再送信成功メッセージ */}
            {resendMessage && (
                <Text color="green.500" fontSize="sm" textAlign="center" fontWeight="bold">
                    {resendMessage}
                </Text>
            )}

            {/* Step 1: ID/PASS入力フェーズ */}
            {step === 'INPUT_CREDENTIALS' && (
                <VStack w="full" gap={6}>
                    <CredentialsForm
                        authPhase={authPhase}
                        setAuthPhase={setAuthPhase}
                        username={username}
                        password={password}
                        isLoading={isLoading}
                        onUsernameChange={setUsername}
                        onPasswordChange={setPassword}
                        onSubmit={handleLogin}
                    />

                    {/* --- 常に表示するオプションエリア --- */}
                    <VStack gap={4} w="full">
                        {/* パスキーはパスワード入力画面の時だけ表示（またはお好みで共通化） */}
                        {authPhase === 'password' && (
                            <PasskeyLoginButton
                                isLoading={isLoading}
                                onClick={handlePasskeyLogin}
                            />
                        )}

                        {/* パスワード忘れリンク：常に表示 */}
                        <Text textAlign="center" fontSize="sm">
                            <Link
                                color="blue.500"
                                href="/forgot-password"
                                variant="underline"
                                _hover={{ color: "blue.600" }}
                            >
                                パスワードをお忘れですか？
                            </Link>
                        </Text>
                    </VStack>
                </VStack>
            )}

            {/* Step 2: OTP入力 */}
            {step === 'INPUT_OTP' && (
                <OtpForm
                    username={maskedEmail}
                    otp={otp}
                    isLoading={isLoading}
                    onOtpChange={setOtp}
                    onSubmit={handleVerifyOtp}
                    onBack={() => {
                        setAuthPhase('email'); // OTPから戻る際はメール入力に戻す
                        handleBackToLogin();
                    }}
                    onResend={handleResend}
                />
            )}

            {/* パスキー登録勧奨モーダル */}
            <PasskeyPromotionModal
                isOpen={isPromotionOpen}
                onClose={() => setIsPromotionOpen(false)}
                onComplete={onPromotionComplete}
            />
        </VStack>
    );
};