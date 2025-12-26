import {
    VStack,
    Input,
    Button,
    Field,
    Group,
    InputElement,
    Text,
    Image,
    Link, Box,
} from "@chakra-ui/react";
import { LuMail } from "react-icons/lu";
import { EnvBadge } from "@/components/elements/EnvBadge";
import logo from "@/assets/logo.jpg";
import React from "react";

type Props = {
    email: string;
    setEmail: (value: string) => void;
    isLoading: boolean;
    error: string | null;
    isValidEmail: boolean;
    onSubmit: (e: React.FormEvent) => void;
};

export const ForgotPasswordForm = ({
                                       email,
                                       setEmail,
                                       isLoading,
                                       error,
                                       isValidEmail,
                                       onSubmit,
                                   }: Props) => {
    return (
        <>
            <Box display="flex" alignItems="center" justifyContent="center" flexDir="column" w="100%" h="100%">
                <Image src={logo} alt="KY System logo" width="78px" mt="4" />
            </Box>

            <VStack gap={4}>
                <Text fontSize="2xl" fontWeight="bold" mt="2">
                    パスワードをお忘れですか？
                </Text>
                <EnvBadge />
            </VStack>

            <Text fontSize="sm" color="gray.600" textAlign="center" my="4">
                登録済みのメールアドレスを入力してください
            </Text>

            <form onSubmit={onSubmit} style={{ width: "100%" }}>
                <VStack gap={6} width="100%" align="stretch">
                    {error && (
                        <Text color="red.500" fontSize="sm" textAlign="center">
                            {error}
                        </Text>
                    )}

                    <Field.Root>
                        <Group w="full" attached>
                            <InputElement pointerEvents="none" color="gray.500">
                                <LuMail />
                            </InputElement>
                            <Input
                                type="email"
                                autoComplete="email"
                                maxLength={255}
                                placeholder="メールアドレス"
                                value={email}
                                pl="10"
                                autoFocus
                                disabled={isLoading}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Group>
                    </Field.Root>

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
                        loadingText="送信中..."
                        disabled={!isValidEmail}
                    >
                        確認コードを送信
                    </Button>

                    <Box display="flex" alignItems="center" justifyContent="center">
                        <Link href="/login" fontSize="sm" color="blue.500" textAlign="center">
                            ログインに戻る
                        </Link>
                    </Box>
                </VStack>
            </form>
        </>
    );
};