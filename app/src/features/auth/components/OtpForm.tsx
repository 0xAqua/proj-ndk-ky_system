import { VStack, Text, Button, Field, Center, PinInput, HStack } from "@chakra-ui/react";
import React, { useMemo } from "react";

type Props = {
    username: string;
    otp: string;
    isLoading: boolean;
    onOtpChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
    onResend: () => void; // ★追加: 再送信イベント
};

export const OtpForm = ({
                            username,
                            otp,
                            isLoading,
                            onOtpChange,
                            onSubmit,
                            onBack,
                            onResend // ★追加
                        }: Props) => {
    // 文字列を配列に変換
    const pinValue = useMemo(() => {
        return otp.padEnd(6, '').slice(0, 6).split('');
    }, [otp]);

    return (
        <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <VStack gap={4} width="100%">
                <VStack w="full">
                    <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
                        {username} 宛に認証コードを送信しました
                    </Text>
                    <Field.Root>
                        <Center w="full">
                            <PinInput.Root
                                otp
                                type="numeric" // ★修正: alphanumeric -> numeric (設計書合わせ)
                                value={pinValue}
                                onValueChange={(details) => {
                                    const newValue = details.valueAsString ?? details.value.join('');
                                    onOtpChange(newValue);
                                }}
                                size="lg"
                                // disabled={isLoading} // ★ローディング中は入力不可にするのがベター
                            >
                                <PinInput.HiddenInput />
                                <PinInput.Control>
                                    <HStack gap={2}>
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <PinInput.Input key={index} index={index} />
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
                    認証
                </Button>

                {/* ★追加: 再送信ボタン */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResend}
                    disabled={isLoading}
                    fontSize="xs"
                    color="blue.500"
                >
                    コードが届かない場合は再送信
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    disabled={isLoading}
                >
                    戻る
                </Button>
            </VStack>
        </form>
    );
};