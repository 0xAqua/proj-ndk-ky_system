import { VStack, Text, Input, Button, Image, Link, Field } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { useLoginForm } from "../hooks/useLoginForm"; // さっき作ったHook

export const LoginForm = () => {
    // ロジックはHookから借りてくる
    const {
        username, setUsername,
        password, setPassword,
        handleLogin, handleKeyPress
    } = useLoginForm();

    return (
        <VStack gap={6}>
            <Image
                src={logo}
                alt="KY System logo"
                width="78px"
                mt="4"
            />
            <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                ログイン
            </Text>
            <VStack gap={1} mb="4">
                <Text fontSize="sm">
                    危険予知システムへようこそ
                </Text>
                <Text fontSize="sm">
                    サービスのご利用にはログインが必要です
                </Text>
            </VStack>

            <Field.Root w="full">
                <Input
                    placeholder="メールアドレスを入力"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyPress} // onKeyPressは非推奨なのでonKeyDown推奨
                />
            </Field.Root>

            <Field.Root w="full">
                <Input
                    type="password"
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyPress}
                />
            </Field.Root>

            <Button
                w="full"
                colorPalette="blue"
                onClick={handleLogin}
            >
                ログイン
            </Button>

            <Text textAlign="left" mt={2} fontSize="sm">
                <Link color="red.500" href="/forgot-password">
                    パスワードをお忘れですか？
                </Link>
            </Text>
        </VStack>
    );
};