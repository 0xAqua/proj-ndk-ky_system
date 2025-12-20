// import React, { useState } from "react";
// import { confirmSignIn, fetchUserAttributes } from "aws-amplify/auth";
// import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";
//
// type OnSuccess = () => void;
// type OnPasskeyPrompt = () => void;
//
// export const useOtpAuth = (onSuccess: OnSuccess, onPasskeyPrompt: OnPasskeyPrompt) => {
//     const [otp, setOtp] = useState("");
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     // ★追加: 再送信成功メッセージ用
//     const [resendMessage, setResendMessage] = useState<string | null>(null);
//
//     const handleVerifyOtp = async (e: React.FormEvent) => {
//         e.preventDefault();
//
//         if (!otp) {
//             setError("認証コードを入力してください。");
//             return;
//         }
//
//         setIsLoading(true);
//         setError(null);
//         setResendMessage(null);
//
//         try {
//             const { isSignedIn } = await confirmSignIn({
//                 challengeResponse: otp
//             });
//
//             if (isSignedIn) {
//                 console.log("Login success");
//
//                 // パスキー登録済みかチェック
//                 try {
//                     const attributes = await fetchUserAttributes();
//                     if (attributes["custom:has_passkey"] !== "1") {
//                         onPasskeyPrompt();
//                         return;
//                     }
//                 } catch (attrError) {
//                     console.warn("属性取得失敗:", attrError);
//                 }
//
//                 onSuccess();
//             } else {
//                 // Lambda側で失敗カウントが増えたが、まだリトライ可能な場合ここに来ます
//                 setError("認証コードが間違っています。");
//             }
//         } catch (err: any) {
//             console.error("OTP verification failed:", err);
//             // ★変更: 共通エラーメッセージを使用
//             setError(getAuthErrorMessage(err));
//         } finally {
//             setIsLoading(false);
//         }
//     };
//
//     // ★追加: 再送信処理
//     const handleResend = async () => {
//         setIsLoading(true);
//         setError(null);
//         setResendMessage(null);
//
//         try {
//             // Lambda ("verify_challenge") に "RESEND" を送る
//             // Lambda ("define_auth") がこれを検知して、新しいコードを発行してループさせます
//             const { nextStep } = await confirmSignIn({
//                 challengeResponse: "RESEND"
//             });
//
//             if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
//                 setResendMessage("新しい認証コードを送信しました。メールをご確認ください。");
//                 setOtp(""); // 入力欄をクリア
//             } else {
//                 setError("再送信中に予期せぬエラーが発生しました。");
//             }
//         } catch (err: any) {
//             console.error("Resend failed:", err);
//             setError(getAuthErrorMessage(err));
//         } finally {
//             setIsLoading(false);
//         }
//     };
//
//     const clearError = () => setError(null);
//     const resetOtp = () => setOtp("");
//
//     return {
//         otp,
//         setOtp,
//         isLoading,
//         error,
//         resendMessage, // ★追加: Form側で表示するために返す
//         handleVerifyOtp,
//         handleResend,  // ★追加: Form側でボタンに紐付ける
//         clearError,
//         resetOtp
//     };
// };