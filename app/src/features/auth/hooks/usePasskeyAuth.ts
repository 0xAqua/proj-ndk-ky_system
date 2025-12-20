// import { useState } from "react";
// import { signIn } from "aws-amplify/auth";
//
// type OnSuccess = () => void;
//
// export const usePasskeyAuth = (onSuccess: OnSuccess) => {
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//
//     const handlePasskeyLogin = async (username: string) => {
//         if (!username) {
//             setError("メールアドレスを入力してください。");
//             return;
//         }
//
//         setIsLoading(true);
//         setError(null);
//
//         try {
//             const { isSignedIn, nextStep } = await signIn({
//                 username,
//                 options: {
//                     authFlowType: 'USER_AUTH',
//                     preferredChallenge: 'WEB_AUTHN'
//                 }
//             });
//
//             if (isSignedIn) {
//                 onSuccess();
//             } else {
//                 console.error("Unexpected Next Step:", nextStep);
//                 // 即座にログイン完了しなかった場合は、想定外のフローとしてエラーを出す
//                 setError("認証を完了できませんでした。別の方法をお試しください。");
//             }
//         } catch (err: any) {
//             console.error("Passkey login failed:", err);
//
//             if (err.name === 'NotAllowedError' || err.message.includes('canceled')) {
//                 setError(null);
//             } else {
//                 setError("パスキー認証に失敗しました。お使いの端末が対応していないか、設定されていません。");
//             }
//         } finally {
//             setIsLoading(false);
//         }
//     };
//
//     const clearError = () => setError(null);
//
//     return {
//         isLoading,
//         error,
//         handlePasskeyLogin,
//         clearError
//     };
// };