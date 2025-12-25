import {VStack, Text, Image, Link} from "@chakra-ui/react";
import logo from '@/assets/logo.jpg';
import { useLoginForm } from "./hooks/useLoginForm.ts";
import { CredentialsForm } from "./components/CredentialsForm.tsx";
import { EnvBadge } from "@/components/elements/EnvBadge";

// 将来使うかもしれないのでimportだけ残してコメントアウトするか、完全に消してもOKです
// import { PasskeyPromotionModal } from "./components/PasskeyPromotionModal.tsx";
// import { OtpForm } from "./components/OtpForm.tsx";
// import { PasskeyLoginButton } from "./components/PasskeyLoginButton.tsx";

export const LoginForm = () => {
    const {
        // step, // 今回はstepによる画面切り替えを行わないため未使用
        username,
        setUsername,
        password,
        setPassword,
        // otp,          // 未使用
        // setOtp,       // 未使用
        handleLogin,
        // handleVerifyOtp,     // 未使用
        isLoading,
        error,
        // showPasskeyModal,    // 未使用
        // setShowPasskeyModal, // 未使用
        // handlePasskeyLogin,  // 未使用
        // handleModalComplete, // 未使用
        // handleBackToLogin,   // 未使用
        // handleResend,        // 未使用
        // resendMessage        // 未使用
    } = useLoginForm();




    return (
        <>
            {/* ★Passkey訴求モーダルは削除（またはコメントアウト） */}
            {/* <PasskeyPromotionModal ... /> */}

            <VStack gap={6}>
                <Image src={logo} alt="KY System logo" width="78px" mt="4" />
                <VStack>
                    <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                        ログイン
                    </Text>
                    <EnvBadge />
                </VStack>

                <VStack gap={1} mb="4">
                    <Text fontSize="sm" color="gray.600">
                        危険予知システムへようこそ
                    </Text>
                    {/* 文言も固定化 */}
                    <Text fontSize="sm" color="gray.600">ログイン情報を入力してください</Text>
                </VStack>

                {/* エラー表示エリア */}
                {error && (
                    <Text color="red.500" fontSize="sm" textAlign="center" fontWeight="bold">
                        {error}
                    </Text>
                )}

                {/* ★OTP再送信メッセージ表示エリアは削除 */}

                {/* Step 1: ID/PASS入力フォーム (条件分岐を外して常に表示) */}
                <CredentialsForm
                    username={username}
                    password={password}
                    isLoading={isLoading}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    onSubmit={handleLogin}
                />

                {/* ★Passkeyログインボタンは削除 */}
                {/* <PasskeyLoginButton ... /> */}


                {/* ★Step 2: OTP入力フォームは削除（将来復活する場合はここに戻す） */}
                {/* {step === 'INPUT_OTP' && ( ... )} */}


                {/* パスワード忘れリンク */}
                <Text textAlign="left" mt={2} fontSize="sm">
                    <Link color="blue.500" href="#">
                        パスワードをお忘れですか？
                    </Link>
                </Text>
            </VStack>
        </>
    );
};