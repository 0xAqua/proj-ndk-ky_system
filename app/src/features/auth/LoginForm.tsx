import { VStack, Text, Image, Link, Center, Spinner } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { useLoginForm } from "./hooks/useLoginForm.ts";
import { PasskeyPromotionModal } from "./components/PasskeyPromotionModal.tsx";
import { CredentialsForm } from "./components/CredentialsForm.tsx";
import { OtpForm } from "./components/OtpForm.tsx";
import { PasskeyLoginButton } from "./components/PasskeyLoginButton.tsx";

export const LoginForm = () => {
    const {
        step,
        username,
        setUsername,
        password,
        setPassword,
        otp,
        setOtp,
        handleLogin,
        handleVerifyOtp,
        isLoading,
        error,
        isCheckingSession,
        showPasskeyModal,
        setShowPasskeyModal,
        handlePasskeyLogin,
        handleModalComplete,
        handleBackToLogin
    } = useLoginForm();

    if (isCheckingSession) {
        return (
            <Center h="100vh">
                <Spinner size="xl" color="blue.500" />
            </Center>
        );
    }

    return (
        <>
            <PasskeyPromotionModal
                isOpen={showPasskeyModal}
                onClose={() => setShowPasskeyModal(false)}
                onComplete={handleModalComplete}
            />
            <VStack gap={6}>
                <Image src={logo} alt="KY System logo" width="78px" mt="4" />
                <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                    ログイン
                </Text>

                <VStack gap={1} mb="4">
                    <Text fontSize="sm" color="gray.600">
                        危険予知システムへようこそ
                    </Text>
                    {step === 'INPUT_CREDENTIALS' ? (
                        <Text fontSize="sm" color="gray.600">ログイン情報を入力してください</Text>
                    ) : (
                        <Text fontSize="sm" color="gray.600">メールに届いた6桁のコードを入力してください</Text>
                    )}
                </VStack>

                {/* エラー表示エリア */}
                {error && (
                    <Text color="red.500" fontSize="sm" textAlign="center" fontWeight="bold">
                        {error}
                    </Text>
                )}

                {/* Step 1: ID/PASS入力フォーム */}
                {step === 'INPUT_CREDENTIALS' && (
                    <>
                        <CredentialsForm
                            username={username}
                            password={password}
                            isLoading={isLoading}
                            onUsernameChange={setUsername}
                            onPasswordChange={setPassword}
                            onSubmit={handleLogin}
                        />
                        <PasskeyLoginButton
                            isLoading={isLoading}
                            onClick={handlePasskeyLogin}
                        />
                    </>
                )}

                {/* Step 2: OTP入力フォーム */}
                {step === 'INPUT_OTP' && (
                    <OtpForm
                        username={username}
                        otp={otp}
                        isLoading={isLoading}
                        onOtpChange={setOtp}
                        onSubmit={handleVerifyOtp}
                        onBack={handleBackToLogin}
                    />
                )}

                {step === 'INPUT_CREDENTIALS' && (
                    <Text textAlign="left" mt={2} fontSize="sm">
                        <Link color="blue.500" href="#">
                            パスワードをお忘れですか？
                        </Link>
                    </Text>
                )}
            </VStack>
        </>
    );
};
