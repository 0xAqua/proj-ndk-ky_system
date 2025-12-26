import { Dialog, Button, Text, VStack, Flex, Icon, Box } from "@chakra-ui/react";
import { useState } from "react";
import { MdFingerprint } from "react-icons/md";
import { PiCheckCircle } from "react-icons/pi";
import { authService } from '@/lib/service/authService.ts';
import { parseCreationOptions, bufferToBase64Url } from "@/lib/utils/webauthn";
import type { RegistrationCredentialJSON } from "@/lib/types/auth";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const PasskeyPromotionModal = ({ isOpen, onClose, onComplete }: Props) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const resp = await authService.getPasskeyRegisterOptions();
            const options = parseCreationOptions(resp.creation_options);

            const credential = await navigator.credentials.create({
                publicKey: options
            }) as PublicKeyCredential;

            if (!credential) throw new Error("No credential returned");

            const response = credential.response as AuthenticatorAttestationResponse;
            const credentialJSON: RegistrationCredentialJSON = {
                id: credential.id,
                rawId: bufferToBase64Url(credential.rawId),
                type: credential.type,
                response: {
                    attestationObject: bufferToBase64Url(response.attestationObject),
                    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
                    transports: response.getTransports ? response.getTransports() : undefined,
                },
                clientExtensionResults: credential.getClientExtensionResults(),
                authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
            };

            const result = await authService.verifyPasskeyRegister({
                credential: credentialJSON
            });

            if (result.success) {
                onComplete();
            } else {
                throw new Error("BFF verification failed");
            }
        } catch (e) {
            console.error("Passkey registration error:", e);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose} placement="center">
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content>
                    <Dialog.Header pb={2}>
                        <Flex align="center" gap={3}>
                            <Flex
                                align="center"
                                justify="center"
                                w={10}
                                h={10}
                                borderRadius="full"
                                bg="green.100"
                            >
                                <Icon as={MdFingerprint} boxSize={5} color="green.600" />
                            </Flex>
                            <Dialog.Title fontSize="lg" fontWeight="bold">
                                パスキーの設定
                            </Dialog.Title>
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body>
                        <VStack gap={4} align="stretch">
                            <Text color="gray.600" lineHeight="tall">
                                指紋認証や顔認証を使って、パスワードなしで
                                安全にログインできるようになります。
                            </Text>

                            <Box
                                p={4}
                                bg="green.50"
                                borderRadius="md"
                            >
                                <VStack gap={2} align="stretch">
                                    {[
                                        "パスワード入力が不要",
                                        "生体認証で安全にログイン",
                                        "次回から素早くアクセス",
                                    ].map((text, i) => (
                                        <Flex key={i} align="center" gap={2}>
                                            <Icon as={PiCheckCircle} color="green.500" boxSize={4} />
                                            <Text fontSize="sm" color="gray.700">
                                                {text}
                                            </Text>
                                        </Flex>
                                    ))}
                                </VStack>
                            </Box>
                        </VStack>
                    </Dialog.Body>
                    <Dialog.Footer pt={4} gap={3}>
                        <Button
                            variant="ghost"
                            onClick={onComplete}
                            disabled={isLoading}
                        >
                            今はしない
                        </Button>
                        <Button
                            colorPalette="green"
                            onClick={handleRegister}
                            loading={isLoading}
                            loadingText="登録中..."
                        >
                            登録する
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};