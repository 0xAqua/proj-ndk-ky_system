// // features/auth/components/PasskeyPromotionModal.tsx
// import {
//     Dialog, Button, Text, VStack
// } from "@chakra-ui/react";
// import { associateWebAuthnCredential, updateUserAttributes } from "aws-amplify/auth";
// import { useState } from "react";
//
// interface Props {
//     isOpen: boolean;
//     onClose: () => void;
//     onComplete: () => void; // 登録完了またはスキップ後に画面遷移させる用
// }
//
// export const PasskeyPromotionModal = ({ isOpen, onClose, onComplete }: Props) => {
//     const [isLoading, setIsLoading] = useState(false);
//
//     const handleRegister = async () => {
//         setIsLoading(true);
//         try {
//             // 1. パスキー (WebAuthn) の登録処理 (ブラウザの指紋認証などが起動)
//             await associateWebAuthnCredential();
//
//             // 2. 成功したらカスタム属性を更新 (次回からこれを見てボタンを表示/非表示など制御可能)
//             await updateUserAttributes({
//                 userAttributes: {
//                     "custom:has_passkey": "1" // ★名前を短くしたやつ
//                 }
//             });
//
//             // alert("パスキーを登録しました！"); // 邪魔なら消してOK
//             onComplete(); // 完了したら遷移
//         } catch (e) {
//             console.error("Passkey registration failed:", e);
//             // キャンセルされた場合などもここに来るので、アラートは出さずに閉じるだけでも良い
//             onClose();
//         } finally {
//             setIsLoading(false);
//         }
//     };
//
//     return (
//         // Chakra UI v3 の Dialog 構文
//         <Dialog.Root open={isOpen} onOpenChange={onClose} placement="center">
//             <Dialog.Backdrop />
//             <Dialog.Positioner>
//                 <Dialog.Content>
//                     <Dialog.Header>
//                         <Dialog.Title>パスキーの設定</Dialog.Title>
//                     </Dialog.Header>
//                     <Dialog.Body>
//                         <VStack align="start" gap={4}>
//                             <Text>
//                                 次回から、指紋認証や顔認証（PassKey）を使って<br />
//                                 パスワード入力なしでログインできるようにしますか？
//                             </Text>
//                             <Text fontSize="sm" color="gray.500">
//                                 ※ この設定は後からでも変更可能です。
//                             </Text>
//                         </VStack>
//                     </Dialog.Body>
//                     <Dialog.Footer>
//                         <Button variant="ghost" onClick={onComplete}>
//                             いいえ（今はしない）
//                         </Button>
//                         <Button colorPalette="blue" onClick={handleRegister} loading={isLoading}>
//                             はい、登録する
//                         </Button>
//                     </Dialog.Footer>
//                 </Dialog.Content>
//             </Dialog.Positioner>
//         </Dialog.Root>
//     );
// };