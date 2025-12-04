import { VStack, Text, Button, Field, Center, PinInput, HStack } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

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
    // 内部では配列で管理（公式推奨）
    const [pinValue, setPinValue] = useState<string[]>(["", "", "", "", "", ""]);

    // 親のotpが変わったら配列に反映
    useEffect(() => {
        const arr = otp.split('').slice(0, 6);
        const padded = [...arr, ...Array(6 - arr.length).fill('')];
        setPinValue(padded);
    }, [otp]);

    const handleValueChange = (details: { value: string[] }) => {
        // undefined を空文字に変換
        const safeValue = details.value.map(v => v ?? '');
        setPinValue(safeValue);
        // 親には文字列で渡す
        onOtpChange(safeValue.join(''));
    };

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
                                onValueChange={handleValueChange}
                                size="lg"
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