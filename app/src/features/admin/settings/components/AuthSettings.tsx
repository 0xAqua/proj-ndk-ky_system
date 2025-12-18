// components/settings/AuthSettings.tsx
import { Box, Flex, Stack, Text, Separator } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { PiEnvelopeSimple, PiFingerprint, PiInfo } from "react-icons/pi";

export const AuthSettings = () => {
    const [emailAuth, setEmailAuth] = useState(false);
    const [passkeyEnabled, setPasskeyEnabled] = useState(false);

    return (
        <Box>
            <Stack gap={8}>
                {/* メール認証 */}
                <Flex
                    justify="space-between"
                    align="center"
                    cursor="pointer"
                    onClick={() => setEmailAuth(!emailAuth)}
                    _hover={{ bg: "gray.50" }}
                    p={2}
                    mx={-2}
                    borderRadius="md"
                    transition="background 0.2s"
                >
                    <Flex align="start" gap={3} flex={1}>
                        <Box color="blue.500" mt={1}>
                            <PiEnvelopeSimple size={20} />
                        </Box>
                        <Box flex={1}>
                            <Text fontWeight="semibold" color="gray.800">
                                メール認証
                            </Text>
                            <Text fontSize="sm" color="gray.500" mt={1}>
                                ログイン時にメールアドレスによる認証を要求します
                            </Text>
                        </Box>
                    </Flex>

                    <Switch
                        colorPalette="blue"
                        checked={emailAuth}
                        pointerEvents="none"
                        size="lg"
                    />
                </Flex>

                <Separator borderColor="gray.100" />

                {/* Passkey設定 */}
                <Box>
                    <Flex
                        justify="space-between"
                        align="center"
                        cursor="pointer"
                        onClick={() => setPasskeyEnabled(!passkeyEnabled)}
                        _hover={{ bg: "gray.50" }}
                        p={2}
                        mx={-2}
                        borderRadius="md"
                        transition="background 0.2s"
                    >
                        <Flex align="start" gap={3} flex={1}>
                            <Box color="green.500" mt={1}>
                                <PiFingerprint size={20} />
                            </Box>
                            <Box flex={1}>
                                <Text fontWeight="semibold" color="gray.800">
                                    Passkey設定
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    生体認証やセキュリティキーでのログインを有効化します
                                </Text>
                            </Box>
                        </Flex>

                        <Switch
                            colorPalette="blue"
                            checked={passkeyEnabled}
                            pointerEvents="none"
                            size="lg"
                        />
                    </Flex>

                    {/* 推奨メッセージ */}
                    <Flex
                        mt={3}
                        p={3}
                        bg="green.50"
                        borderRadius="md"
                        borderLeftColor="green.400"
                        gap={2}
                        align="start"
                    >
                        <Box color="green.500" mt={0.5}>
                            <PiInfo size={16} />
                        </Box>
                        <Text fontSize="xs" color="green.700">
                            パスワードレス認証を推奨します。より安全で便利なログインが可能になります
                        </Text>
                    </Flex>
                </Box>
            </Stack>
        </Box>
    );
};