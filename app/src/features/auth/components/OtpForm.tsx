import { VStack, Text, Button, Field, Center, PinInput, HStack } from "@chakra-ui/react";
import React, { useMemo } from "react";

type Props = {
    username: string;
    otp: string;
    isLoading: boolean;
    onOtpChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
    onResend: () => void;
};

export const OtpForm = ({
                            username,
                            otp,
                            isLoading,
                            onOtpChange,
                            onSubmit,
                            onBack,
                            onResend
                        }: Props) => {

    // 配列として適切に変換（undefinedを防ぐ）
    const pinValue = useMemo(() => {
        const chars = otp.split('');
        return Array.from({ length: 6 }, (_, i) => chars[i] ?? '');
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
                                type="alphanumeric"
                                value={pinValue}
                                onValueChange={(details) => {
                                    const valueArray = details.value;
                                    if (Array.isArray(valueArray)) {
                                        // undefinedを空文字列に置換してから結合
                                        const newValue = valueArray
                                            .map(v => v ?? '')
                                            .join('');
                                        onOtpChange(newValue);
                                    }
                                }}
                                size="lg"
                                disabled={isLoading}
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
                    loadingText="認証中..."
                >
                    認証
                </Button>

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