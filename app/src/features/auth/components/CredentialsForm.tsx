import {VStack, Input, Button, Field, Group, InputElement, Text, Link, Box, HStack} from "@chakra-ui/react";
import { LuMail, LuLock, LuArrowLeft } from "react-icons/lu";
import React, { useMemo } from "react";

type Props = {
    authPhase: 'email' | 'password';
    setAuthPhase: (phase: 'email' | 'password') => void;
    username: string;
    password: string;
    isLoading: boolean;
    onUsernameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
};

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const CredentialsForm = ({
                                    authPhase,
                                    setAuthPhase,
                                    username,
                                    password,
                                    isLoading,
                                    onUsernameChange,
                                    onPasswordChange,
                                    onSubmit
                                }: Props) => {

    const emailValid = useMemo(() => isValidEmail(username), [username]);
    const showEmailError = username.length > 0 && !emailValid;

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

                {authPhase === 'email' ? (
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
                    /* ステップ 2: パスワード入力 */
                    <>
                        <VStack align="start" gap={1}>
                            <Box display="flex" alignItems="center" gap={2} w="full">
                                <VStack flex={1} alignItems="flex-start">
                                    <Text fontSize="xs" color="gray.400" >メールアドレス</Text>
                                    <HStack>
                                        <Text fontSize="sm" color="gray.600">
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
                                        >
                                            <LuArrowLeft size={12} /> 修正する
                                        </Link>
                                    </HStack>
                                </VStack>

                            </Box>
                        </VStack>

                        <Field.Root w="full">
                            <Group w="full" attached>
                                <InputElement pointerEvents="none" color="gray.500">
                                    <LuLock />
                                </InputElement>
                                <Input
                                    name="password"
                                    type="password"
                                    maxLength={64}
                                    autoComplete="current-password"
                                    placeholder="パスワードを入力"
                                    value={password}
                                    pl="10"
                                    autoFocus
                                    onChange={(e) => onPasswordChange(e.target.value)}
                                />
                            </Group>
                        </Field.Root>
                        <Text fontSize="xs" color="gray.500" mt={1}>
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
                        >
                            ログイン
                        </Button>
                    </>
                )}
            </VStack>
        </form>
    );
};