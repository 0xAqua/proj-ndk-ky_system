import { VStack, Text, Input, Button, Image, Link, Field } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { useLoginForm } from "../hooks/useLoginForm";

export const LoginForm = () => {
    const {
        username, setUsername,
        password, setPassword,
        handleLogin,
        isLoading, // ローディング状態も使うと親切
        error      // エラーメッセージも表示
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
                <Text fontSize="sm" color="gray.600">
                    危険予知システムへようこそ
                </Text>
                <Text fontSize="sm" color="gray.600">
                    サービスのご利用にはログインが必要です
                </Text>
            </VStack>

            {/* ★ここがポイント！ formタグで囲む */}
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <VStack gap={4} width="100%">

                    {/* エラーがあれば表示 */}
                    {error && (
                        <Text color="red.500" fontSize="sm" textAlign="center">
                            {error}
                        </Text>
                    )}

                    <Field.Root w="full">
                        <Input
                            name="email" // 自動入力に必須
                            autoComplete="email" // ブラウザがメアドを提案してくれる
                            placeholder="メールアドレスを入力"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </Field.Root>

                    <Field.Root w="full">
                        <Input
                            name="password"
                            autoComplete="current-password" // パスワード管理ツールが反応する
                            type="password"
                            placeholder="パスワードを入力"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Field.Root>

                    <Button
                        type="submit" // これでEnterキーで送信される
                        w="full"
                        colorPalette="blue"
                        loading={isLoading} // 連打防止 & くるくる表示
                        loadingText="ログイン中..."
                    >
                        ログイン
                    </Button>
                </VStack>
            </form>

            <Text textAlign="left" mt={2} fontSize="sm">
                <Link color="blue.500" href="/">
                    パスワードをお忘れですか？
                </Link>
            </Text>
        </VStack>

    );
};