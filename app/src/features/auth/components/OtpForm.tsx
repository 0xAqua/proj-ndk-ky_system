import { VStack, Text, Button, Field, Center, PinInput, HStack } from "@chakra-ui/react";
import React from "react";

type Props = {
    username: string;
    otp: string;
    isLoading: boolean;
    onOtpChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onBack: () => void;
};

export const OtpForm = ({
                            username,
                            otp,
                            isLoading,
                            onOtpChange,
                            onSubmit,
                            onBack
                        }: Props) => {
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
                                value={Array(6).fill('').map((_, i) => otp[i] || '')}
                                onValueChange={(e) => {
                                    const cleanValue = e.value
                                        .map(v => v ?? '')
                                        .join('');
                                    onOtpChange(cleanValue);
                                }}
                                size="lg"
                            >
                                <PinInput.HiddenInput />
                                <PinInput.Control>
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
                    onClick={onBack}
                    disabled={isLoading}
                >
                    戻る
                </Button>
            </VStack>
        </form>
    );
};
