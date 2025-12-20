// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { getCurrentUser } from "aws-amplify/auth";
// import { useQueryClient } from "@tanstack/react-query";
//
// import { useCredentialsAuth } from "./useCredentialsAuth";
// import { useOtpAuth } from "./useOtpAuth";
// import { usePasskeyAuth } from "./usePasskeyAuth";
// import { fetchConstructionMaster } from "@/client/construction.ts";
//
// export type LoginStep = 'INPUT_CREDENTIALS' | 'INPUT_OTP';
//
// export const useLoginForm = () => {
//     const [step, setStep] = useState<LoginStep>('INPUT_CREDENTIALS');
//     const [showPasskeyModal, setShowPasskeyModal] = useState(false);
//     const [isCheckingSession, setIsCheckingSession] = useState(true);
//
//     // ★追加: デバイス記憶のチェック状態管理
//     const [rememberDevice, setRememberDevice] = useState(false);
//
//     const navigate = useNavigate();
//     const queryClient = useQueryClient();
//
//     const prefetchMasterData = () => {
//         void queryClient.prefetchQuery({
//             queryKey: ['constructionMaster'],
//             queryFn: fetchConstructionMaster,
//             staleTime: 1000 * 60 * 60,
//         });
//     };
//
//     const handleSuccess = () => {
//         prefetchMasterData();
//         navigate("/entry");
//     };
//
//     const handlePasskeyPrompt = () => {
//         setShowPasskeyModal(true);
//     };
//
//     const handleOtpRequired = () => {
//         setStep('INPUT_OTP');
//     };
//
//     // 各認証hookを初期化
//     // ★修正: rememberDevice を第2引数として渡す
//     const credentialsAuth = useCredentialsAuth(handleOtpRequired);
//
//     const otpAuth = useOtpAuth(handleSuccess, handlePasskeyPrompt);
//     const passkeyAuth = usePasskeyAuth(handleSuccess);
//
//     useEffect(() => {
//         const checkAuth = async () => {
//             try {
//                 await getCurrentUser();
//                 console.log("Already logged in");
//                 prefetchMasterData();
//                 navigate("/entry", { replace: true });
//             } catch (err) {
//                 console.log("Not logged in");
//             } finally {
//                 setIsCheckingSession(false);
//             }
//         };
//         void checkAuth();
//     }, [navigate]);
//
//     const handlePasskeyLogin = () => {
//         void passkeyAuth.handlePasskeyLogin(credentialsAuth.username);
//     };
//
//     const handleModalComplete = () => {
//         setShowPasskeyModal(false);
//         prefetchMasterData();
//         navigate("/entry");
//     };
//
//     const handleBackToLogin = () => {
//         setStep('INPUT_CREDENTIALS');
//     };
//
//     const error = credentialsAuth.error || otpAuth.error || passkeyAuth.error;
//     const isLoading = credentialsAuth.isLoading || otpAuth.isLoading || passkeyAuth.isLoading;
//
//     return {
//         // ステップ管理
//         step,
//         isCheckingSession,
//
//         // Credentials
//         username: credentialsAuth.username,
//         setUsername: credentialsAuth.setUsername,
//         password: credentialsAuth.password,
//         setPassword: credentialsAuth.setPassword,
//         handleLogin: credentialsAuth.handleLogin,
//
//         // ★追加: UI側でチェックボックスをバインドするために公開
//         rememberDevice,
//         setRememberDevice,
//
//         // OTP
//         otp: otpAuth.otp,
//         setOtp: otpAuth.setOtp,
//         handleVerifyOtp: otpAuth.handleVerifyOtp,
//         handleBackToLogin,
//
//         // 再送信機能
//         handleResend: otpAuth.handleResend,
//         resendMessage: otpAuth.resendMessage,
//
//         // Passkey
//         handlePasskeyLogin,
//         showPasskeyModal,
//         setShowPasskeyModal,
//         handleModalComplete,
//
//         // 共通
//         isLoading,
//         error
//     };
// };