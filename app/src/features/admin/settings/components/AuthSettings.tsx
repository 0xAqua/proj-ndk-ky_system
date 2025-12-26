import { Box, Flex, Stack, Text, Separator, Spinner } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { PiEnvelopeSimple, PiFingerprint, PiInfo } from "react-icons/pi";
import type { SecurityConfig } from "@/lib/service/tenantConfig";

interface AuthSettingsProps {
    config: SecurityConfig | null;
    onChange: (config: SecurityConfig) => void;
    isLoading: boolean;
}

export const AuthSettings = ({ config, onChange, isLoading }: AuthSettingsProps) => {
    if (isLoading || !config) {
        return (
            <Flex justify="center" align="center" minH="200px">
                <Spinner size="lg" color="blue.500" />
            </Flex>
        );
    }

    const handleOtpToggle = () => {
        // Passkey有効中はOTPをOFFにできない
        if (config.otp_enabled && config.passkey_enabled) {
            return;
        }
        onChange({
            ...config,
            otp_enabled: !config.otp_enabled,
        });
    };

    const handlePasskeyToggle = () => {
        const newPasskeyEnabled = !config.passkey_enabled;
        onChange({
            ...config,
            passkey_enabled: newPasskeyEnabled,
            // Passkey ON → OTP強制ON
            otp_enabled: newPasskeyEnabled ? true : config.otp_enabled,
        });
    };

    return (
        <Box>
            <Stack gap={8}>
                {/* メール認証（OTP） */}
                <Flex
                    justify="space-between"
                    align="center"
                    cursor={config.passkey_enabled ? "not-allowed" : "pointer"}
                    onClick={handleOtpToggle}
                    _hover={{ bg: config.passkey_enabled ? "transparent" : "gray.50" }}
                    p={2}
                    mx={-2}
                    borderRadius="md"
                    transition="background 0.2s"
                    opacity={config.passkey_enabled ? 0.6 : 1}
                >
                    <Flex align="start" gap={3} flex={1}>
                        <Box color="blue.500" mt={1}>
                            <PiEnvelopeSimple size={20} />
                        </Box>
                        <Box flex={1}>
                            <Text fontWeight="semibold" color="gray.800">
                                メール認証（One Time Password）
                            </Text>
                            <Text fontSize="sm" color="gray.500" mt={1}>
                                ログイン時にメールアドレスによるワンタイムパスワード認証を要求します
                            </Text>
                            {config.passkey_enabled && (
                                <Text fontSize="xs" color="orange.500" mt={1}>
                                    ※ Passkey有効時はメール認証も必須です
                                </Text>
                            )}
                        </Box>
                    </Flex>

                    <Switch
                        colorPalette="blue"
                        checked={config.otp_enabled}
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
                        onClick={handlePasskeyToggle}
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
                                    （推奨）Passkey設定
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    生体認証やセキュリティキーでのログインを有効化します
                                </Text>
                            </Box>
                        </Flex>

                        <Switch
                            colorPalette="blue"
                            checked={config.passkey_enabled}
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