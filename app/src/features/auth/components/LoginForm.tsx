import { VStack, Text, Input, Button, Image, Link, Field, Center, Spinner, Box } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { useLoginForm } from "../hooks/useLoginForm";

export const LoginForm = () => {
    const {
        step,
        username, setUsername,
        otp, setOtp,
        handleSendEmail,
        handleVerifyOtp,
        isLoading,
        error,
        isCheckingSession
    } = useLoginForm();

    if (isCheckingSession) {
        return (
            <Center h="100vh">
                <Spinner size="xl" color="blue.500" />
            </Center>
        );
    }

    return (
        <VStack gap={6}>
            <Image src={logo} alt="KY System logo" width="78px" mt="4" />
            <Text fontSize="2xl" fontWeight="bold" mb="2" mt="2">
                ログイン
            </Text>

            <VStack gap={1} mb="4">
                <Text fontSize="sm" color="gray.600">
                    危険予知システムへようこそ
                </Text>
                {step === 'INPUT_EMAIL' ? (
                    <Text fontSize="sm" color="gray.600">メールアドレスを入力して認証コードを受け取ってください</Text>
                ) : (
                    <Text fontSize="sm" color="gray.600">メールに届いた6桁のコードを入力してください</Text>
                )}
            </VStack>

            {/* エラー表示エリア */}
            {error && (
                <Text color="red.500" fontSize="sm" textAlign="center" fontWeight="bold">
                    {error}
                </Text>
            )}

            {/* ───────────────────────────── */}
            {/* Step 1: メール入力フォーム */}
            {/* ───────────────────────────── */}
            {step === 'INPUT_EMAIL' && (
                <form onSubmit={handleSendEmail} style={{ width: '100%' }}>
                    <VStack gap={4} width="100%">
                        <Field.Root w="full">
                            <Input
                                name="email"
                                autoComplete="email"
                                placeholder="メールアドレス"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </Field.Root>

                        <Button
                            type="submit"
                            w="full"
                            colorPalette="blue"
                            loading={isLoading}
                            loadingText="送信中..."
                        >
                            認証コードを送信
                        </Button>
                    </VStack>
                </form>
            )}

            {/* ───────────────────────────── */}
            {/* Step 2: OTP入力フォーム */}
            {/* ───────────────────────────── */}
            {step === 'INPUT_OTP' && (
                <form onSubmit={handleVerifyOtp} style={{ width: '100%' }}>
                    <VStack gap={4} width="100%">
                        <Box w="full">
                            {/* メールアドレスの確認表示（親切設計） */}
                            <Text fontSize="xs" color="gray.500" mb={2}>
                                {username} 宛に送信しました
                            </Text>
                            <Field.Root w="full">
                                <Input
                                    name="one-time-code"
                                    autoComplete="one-time-code"
                                    placeholder="000000"
                                    textAlign="center"
                                    letterSpacing="0.5em" // 数字を見やすく
                                    fontSize="lg"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </Field.Root>
                        </Box>

                        <Button
                            type="submit"
                            w="full"
                            colorPalette="blue"
                            loading={isLoading}
                            loadingText="認証中..."
                        >
                            ログイン
                        </Button>

                        {/* メアド入力に戻るボタン */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.reload()} // 簡易的にリロードでリセット
                            disabled={isLoading}
                        >
                            メールアドレスを修正
                        </Button>
                    </VStack>
                </form>
            )}

            {/* フッターリンク (パスワードをお忘れですか？は不要になるので削除か変更) */}
            <Text textAlign="left" mt={2} fontSize="sm">
                <Link color="blue.500" href="#">
                    アカウントをお持ちでない場合
                </Link>
            </Text>
        </VStack>
    );
};