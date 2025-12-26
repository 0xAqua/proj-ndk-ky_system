import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from "@/components/ui/dialog";
import { Button, Text, Box, Icon, Flex, VStack } from "@chakra-ui/react";
import {PiCheckCircle, PiShieldCheck, PiWarningFill} from "react-icons/pi";

interface AuthConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSaving: boolean;
}

export const AuthConfirmDialog = ({
                                      open,
                                      onOpenChange,
                                      onConfirm,
                                      isSaving,
                                  }: AuthConfirmDialogProps) => {
    return (
        <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <DialogContent>
                <DialogHeader pb={2}>
                    <Flex align="center" gap={3}>
                        <Flex
                            align="center"
                            justify="center"
                            w={10}
                            h={10}
                            borderRadius="full"
                            bg="orange.100"
                        >
                            <Icon as={PiShieldCheck} boxSize={5} color="orange.600" />
                        </Flex>
                        <DialogTitle fontSize="lg" fontWeight="bold">
                            認証設定の変更確認
                        </DialogTitle>
                    </Flex>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={4} align="stretch">
                        <Text color="gray.600" lineHeight="tall">
                            認証設定を変更します。この変更はセキュリティに影響するため、
                            慎重にご確認ください。
                        </Text>

                        <Box
                            p={4}
                            bg="orange.50"
                            borderRadius="md"
                            borderLeftColor="orange.400"
                        >
                            <Flex align="center" gap={2} mb={2}>
                                <Icon as={PiWarningFill} color="orange.500" boxSize={4} />
                                <Text fontWeight="semibold" color="orange.700" fontSize="sm">
                                    ご注意ください
                                </Text>
                            </Flex>
                            <Text fontSize="sm" color="gray.700" lineHeight="tall">
                                設定変更後、ユーザーは次回ログイン時から新しい認証方法が適用されます。
                                無効化した認証方法は使用できなくなります。
                            </Text>
                        </Box>
                    </VStack>
                </DialogBody>
                <DialogFooter pt={4} gap={3}>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        キャンセル
                    </Button>
                    <Button
                        colorPalette="orange"
                        onClick={onConfirm}
                        loading={isSaving}
                    >
                        <Icon as={PiCheckCircle} mr={1} />
                        保存する
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
};