// components/ResetPasswordForm.tsx
import {
    VStack,
    Input,
    Button,
    Field,
    Group,
    InputElement,
    Text,
    Image,
    Box,
} from "@chakra-ui/react";
import { LuKeyRound, LuLock } from "react-icons/lu";
import { EnvBadge } from "@/components/elements/EnvBadge.tsx";
import logo from "@/assets/logo.jpg";
import React from "react";

type Props = {
    email: string;
    otp: string;
    setOtp: (value: string) => void;
    newPassword: string;
    setNewPassword: (value: string) => void;
    confirmPassword: string;
    setConfirmPassword: (value: string) => void;
    isLoading: boolean;
    error: string | null;
    passwordMismatch: boolean;
    isResetValid: boolean;
    handleResetPassword: (e: React.FormEvent) => void;
    handleResendCode: () => void;
    handleBackToEmail: () => void;
};

export const ResetPasswordForm = ({
                                      email,
                                      otp,
                                      setOtp,
                                      newPassword,
                                      setNewPassword,
                                      confirmPassword,
                                      setConfirmPassword,
                                      isLoading,
                                      error,
                                      passwordMismatch,
                                      isResetValid,
                                      handleResetPassword,
                                      handleResendCode,
                                      handleBackToEmail,
                                  }: Props) => {
    return (
        <>
            <Box display="flex" alignItems="center" justifyContent="center" flexDir="column" w="100%" h="100%">
                <Image src={logo} alt="KY System logo" width="78px" mt="4" />
            </Box>
            <VStack>
                <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                    パスワード再設定
                </Text>
                <EnvBadge />
            </VStack>

            <Text fontSize="sm" color="gray.600" textAlign="center" my="4">
                {email} 宛 <br/>に送信されたコードを入力してください
            </Text>

            <form onSubmit={handleResetPassword} style={{ width: "100%" }}>
                <VStack gap={6} width="100%" align="stretch">
                    {error && (
                        <Text color="red.500" fontSize="sm" textAlign="center">
                            {error}
                        </Text>
                    )}

                    {/* 確認コード */}
                    <Field.Root>
                        <Field.Label fontSize="sm" color="gray.600">
                            確認コード
                        </Field.Label>
                        <Group w="full" attached>
                            <InputElement pointerEvents="none" color="gray.500">
                                <LuKeyRound />
                            </InputElement>
                            <Input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="6桁のコードを入力"
                                value={otp}
                                pl="10"
                                autoFocus
                                disabled={isLoading}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, "");
                                    setOtp(value);
                                }}
                            />
                        </Group>
                    </Field.Root>

                    {/* 新しいパスワード */}
                    <Field.Root>
                        <Field.Label fontSize="sm" color="gray.600">
                            新しいパスワード
                        </Field.Label>
                        <Group w="full" attached>
                            <InputElement pointerEvents="none" color="gray.500">
                                <LuLock />
                            </InputElement>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                maxLength={64}
                                placeholder="新しいパスワードを入力"
                                value={newPassword}
                                pl="10"
                                disabled={isLoading}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </Group>
                    </Field.Root>

                    {/* パスワード確認 */}
                    <Field.Root invalid={passwordMismatch}>
                        <Field.Label fontSize="sm" color="gray.600">
                            パスワード（確認）
                        </Field.Label>
                        <Group w="full" attached>
                            <InputElement pointerEvents="none" color="gray.500">
                                <LuLock />
                            </InputElement>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                maxLength={64}
                                placeholder="パスワードを再入力"
                                value={confirmPassword}
                                pl="10"
                                disabled={isLoading}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Group>
                        {passwordMismatch && (
                            <Field.ErrorText>パスワードが一致しません</Field.ErrorText>
                        )}
                    </Field.Root>

                    {/* 送信ボタン */}
                    <Button
                        type="submit"
                        w="full"
                        rounded="full"
                        h="12"
                        colorPalette="blue"
                        variant="solid"
                        boxShadow="subtle"
                        _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
                        loading={isLoading}
                        loadingText="変更中..."
                        disabled={!isResetValid}
                    >
                        パスワードを変更
                    </Button>

                    {/* コード再送信・戻るリンク */}
                    <VStack gap={2}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResendCode}
                            disabled={isLoading}
                        >
                            確認コードを再送信
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBackToEmail}
                            disabled={isLoading}
                            color={"gray.400"}
                        >
                            メールアドレスを変更
                        </Button>
                    </VStack>
                </VStack>
            </form>
        </>
    );
};