import { VStack, Input, Button, Field, Group, InputElement, Text, Link, Box, HStack, Alert } from "@chakra-ui/react";
import { LuMail, LuLock, LuArrowLeft, LuLoaderCircle } from "react-icons/lu";
import React, { useMemo } from "react";

type Props = {
    authPhase: 'email' | 'password';
    setAuthPhase: (phase: 'email' | 'password') => void;
    username: string;
    password: string;
    isLoading: boolean;
    // ▼ 追加: APIエラーメッセージを受け取るためのProps
    errorMessage?: string | null;
    onUsernameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
};

// メールアドレスの検証
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// ▼ 追加: パスワードルールの検証
const isValidPassword = (password: string): boolean => {
    // 10桁以上、大文字1、小文字1、数字1、記号1
    const lengthCheck = password.length >= 10;
    const upperCheck = /[A-Z]/.test(password);
    const lowerCheck = /[a-z]/.test(password);
    const numberCheck = /[0-9]/.test(password);
    const symbolCheck = /[!-/:-@[-`{-~]/.test(password); // 一般的な記号範囲

    return lengthCheck && upperCheck && lowerCheck && numberCheck && symbolCheck;
};

export const CredentialsForm = ({
                                    authPhase,
                                    setAuthPhase,
                                    username,
                                    password,
                                    isLoading,
                                    errorMessage, // 受け取り
                                    onUsernameChange,
                                    onPasswordChange,
                                    onSubmit
                                }: Props) => {

    // バリデーション状態の計算
    const emailValid = useMemo(() => isValidEmail(username), [username]);
    const showEmailError = username.length > 0 && !emailValid;

    // ▼ パスワードバリデーション
    const passwordValid = useMemo(() => isValidPassword(password), [password]);
    // 入力があり、かつ無効な場合にエラー表示
    const showPasswordError = password.length > 0 && !passwordValid;

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (emailValid) {
            setAuthPhase('password');
        }
    };

    const handleBack = () => {
        setAuthPhase('email');
    };

    return (
        <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <VStack gap={6} width="100%" align="stretch">

                {/* ▼ APIエラーメッセージの表示エリア (共通) */}
                {errorMessage && (
                    <Alert.Root status="error" variant="subtle" rounded="md">
                        <Alert.Indicator>
                            <LuLoaderCircle />
                        </Alert.Indicator>
                        <Alert.Content>
                            <Alert.Title>ログインに失敗しました</Alert.Title>
                            <Alert.Description fontSize="sm">
                                {errorMessage}
                            </Alert.Description>
                        </Alert.Content>
                    </Alert.Root>
                )}

                {authPhase === 'email' ? (
                    // ──────────────────────────────────────────
                    // Step 1: メールアドレス入力
                    // ──────────────────────────────────────────
                    <>
                        <Field.Root w="full" invalid={showEmailError}>
                            <Group w="full" attached>
                                <InputElement pointerEvents="none" color="gray.500">
                                    <LuMail />
                                </InputElement>
                                <Input
                                    name="email"
                                    autoComplete="email"
                                    maxLength={255}
                                    placeholder="メールアドレス"
                                    value={username}
                                    pl="10"
                                    required
                                    autoFocus
                                    onChange={(e) => onUsernameChange(e.target.value)}
                                />
                            </Group>
                            {showEmailError && (
                                <Field.ErrorText>
                                    有効なメールアドレスを入力してください
                                </Field.ErrorText>
                            )}
                        </Field.Root>

                        <Button
                            onClick={handleNext}
                            disabled={!emailValid}
                            w="full"
                            rounded="full"
                            h="12"
                            colorPalette="blue"
                            variant="solid"
                        >
                            次へ
                        </Button>
                    </>
                ) : (
                    // ──────────────────────────────────────────
                    // Step 2: パスワード入力
                    // ──────────────────────────────────────────
                    <>
                        <VStack align="start" gap={1}>
                            <Box display="flex" alignItems="center" gap={2} w="full">
                                <VStack flex={1} alignItems="flex-start" gap={0}>
                                    <Text fontSize="xs" color="gray.400">メールアドレス</Text>
                                    <HStack>
                                        <Text fontSize="sm" color="gray.600" fontWeight="medium">
                                            {username}
                                        </Text>
                                        <Link
                                            variant="underline"
                                            fontSize="xs"
                                            onClick={handleBack}
                                            display="flex"
                                            alignItems="center"
                                            color="blue.500"
                                            gap={1}
                                            cursor="pointer"
                                        >
                                            <LuArrowLeft size={12} /> 修正
                                        </Link>
                                    </HStack>
                                </VStack>
                            </Box>
                        </VStack>

                        <Field.Root w="full" invalid={showPasswordError}>
                            <Group w="full" attached>
                                <InputElement pointerEvents="none" color="gray.500">
                                    <LuLock />
                                </InputElement>
                                <Input
                                    name="password"
                                    type="password"
                                    maxLength={64}
                                    autoComplete="current-password"
                                    placeholder="パスワード"
                                    value={password}
                                    pl="10"
                                    autoFocus
                                    onChange={(e) => onPasswordChange(e.target.value)}
                                />
                            </Group>

                            {/* ▼ バリデーションエラー詳細 */}
                            {showPasswordError && (
                                <Field.ErrorText fontSize="xs" mt={2} lineHeight="1.4">
                                    パスワードは以下の条件を満たす必要があります：<br/>
                                    ・10文字以上<br/>
                                    ・大文字、小文字、数字、記号を各1つ以上含む
                                </Field.ErrorText>
                            )}
                        </Field.Root>

                        <Text fontSize="xs" color="gray.500">
                            パスキーを登録すると、パスワード入力は不要になります。
                        </Text>

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
                            loadingText="認証中..."
                            // ▼ ルールを満たしていない場合はボタンを押せないようにする
                            disabled={!passwordValid || isLoading}
                        >
                            ログイン
                        </Button>
                    </>
                )}
            </VStack>
        </form>
    );
};