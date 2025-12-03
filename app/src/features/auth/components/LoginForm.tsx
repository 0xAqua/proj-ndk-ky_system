import { VStack, Text, Input, Button, Image, Link, Field, Center, Spinner, PinInput, HStack } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { useLoginForm } from "../hooks/useLoginForm";

export const LoginForm = () => {
    const {
        step,
        username, setUsername,
        password, setPassword,
        otp, setOtp,
        handleLogin,
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
                {step === 'INPUT_CREDENTIALS' ? (
                    <Text fontSize="sm" color="gray.600">ログイン情報を入力してください</Text>
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
            {/* Step 1: ID/PASS入力フォーム */}
            {/* ───────────────────────────── */}
            {step === 'INPUT_CREDENTIALS' && (
                <form onSubmit={handleLogin} style={{ width: '100%' }}>
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

                        <Field.Root w="full">
                            <Input
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="パスワード"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field.Root>

                        <Button
                            type="submit"
                            w="full"
                            colorPalette="blue"
                            loading={isLoading}
                            loadingText="認証中..."
                        >
                            次へ
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
                        <VStack w="full">
                            <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
                                {username} 宛に認証コードを送信しました
                            </Text>
                            <Field.Root>
                                <Center w={"full"}>
                                    <PinInput.Root
                                        otp
                                        type="alphanumeric"
                                        value={otp.split('')}
                                        onValueChange={(e) => setOtp(e.valueAsString)}
                                        size="lg"
                                    >
                                        <PinInput.HiddenInput />
                                        <PinInput.Control>
                                            {/* 6桁分の枠を表示 */}
                                            <HStack gap={2}>
                                                {[0, 1, 2, 3, 4, 5].map((id, index) => (
                                                    <PinInput.Input key={id} index={index} />
                                                ))}
                                            </HStack>
                                        </PinInput.Control>
                                    </PinInput.Root>
                                </Center>
                            </Field.Root>
                        </VStack>

                        <Button
                            type="submit"
                            w="full"
                            colorPalette="blue"
                            loading={isLoading}
                            loadingText="確認中..."
                        >
                            ログイン
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.reload()}
                            disabled={isLoading}
                        >
                            戻る
                        </Button>
                    </VStack>
                </form>
            )}

            {step === 'INPUT_CREDENTIALS' && (
                <Text textAlign="left" mt={2} fontSize="sm">
                    <Link color="blue.500" href="#">
                        パスワードをお忘れですか？
                    </Link>
                </Text>
            )}
        </VStack>
    );
};