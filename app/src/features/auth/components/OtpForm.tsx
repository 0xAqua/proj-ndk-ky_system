import { VStack, Text, Button, Field, Center, PinInput, HStack, Box } from "@chakra-ui/react";
import { LuShieldCheck } from "react-icons/lu"; // セキュリティ感を出すアイコン
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

    const pinValue = useMemo(() => {
        const chars = otp.split('');
        return Array.from({ length: 6 }, (_, i) => chars[i] ?? '');
    }, [otp]);

    return (
        <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <VStack gap={6} width="100%">
                {/* ヘッダー部分：セキュリティ意識を高める */}
                <VStack gap={2} textAlign="center">
                    <Center bg="blue.50" color="blue.600" w={12} h={12} rounded="full">
                        <LuShieldCheck size="24px" />
                    </Center>
                    <Text fontSize="sm" color="gray.500" mt={4}>
                        {username}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        宛に送信された6桁のコードを入力してください
                    </Text>
                </VStack>

                {/* 入力エリア：中央に大きく配置 */}
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

                {/* アクションボタン：メインは丸く大きく */}
                <VStack w="full" gap={3}>
                    <Button
                        type="submit"
                        w="full"
                        colorPalette="blue"
                        loading={isLoading}
                        loadingText="認証中..."
                        rounded="full"
                        h={12}
                        fontSize="md"
                        boxShadow="md"
                    >
                        認証を完了する
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResend}
                        disabled={isLoading}
                        color="blue.600"
                        _hover={{ bg: "blue.50" }}
                    >
                        コードが届かない場合は再送信
                    </Button>

                    <Box pt={2}>
                        <Button
                            variant="plain"
                            size="xs"
                            onClick={onBack}
                            disabled={isLoading}
                            color="gray.500"
                        >
                            戻る
                        </Button>
                    </Box>
                </VStack>
            </VStack>
        </form>
    );
};