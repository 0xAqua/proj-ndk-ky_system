import {
    DialogActionTrigger,
    DialogBackdrop,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogRoot,
} from "@chakra-ui/react";
import { Button, Text, Stack, Box, HStack } from "@chakra-ui/react";
import { PiTrash } from "react-icons/pi";

export const DeleteConfirmDialog = ({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        email
                                    }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    email: string;
}) => {
    return (
        <DialogRoot
            open={isOpen}
            onOpenChange={(e) => !e.open && onClose()}
            size="sm"
        >
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent
                maxW="420px"
                position="fixed"
                top="35%"
                left="50%"
                transform="translate(-50%, -50%)"
                borderRadius="xl"
                overflow="hidden"
                p={0}
            >
                {/* クリーンなヘッダー */}
                <Box
                    bg="red.50"
                    borderBottomWidth="1px"
                    borderColor="red.100"
                    p={5}
                >
                    <HStack gap={3}>
                        <Box
                            bg="red.500"
                            color="white"
                            p={2.5}
                            borderRadius="lg"
                        >
                            <PiTrash size={20} strokeWidth={2} />
                        </Box>
                        <Text fontSize="lg" fontWeight="semibold" color="gray.900">
                            ユーザー削除の確認
                        </Text>
                    </HStack>
                </Box>

                <DialogCloseTrigger top={4} right={4} />

                <DialogBody p={6}>
                    <Stack gap={4}>
                        <Stack gap={3}>
                            <Text fontSize="sm" color="gray.700" lineHeight="tall">
                                以下のユーザーを削除しようとしています。<br/>
                                この操作は取り消すことができません。
                            </Text>

                            <Box
                                bg="gray.50"
                                p={4}
                                borderRadius="lg"
                                borderWidth="1px"
                                borderColor="gray.200"
                            >
                                <Text fontSize="xs" color="gray.500" mb={1.5}>
                                    削除対象のユーザー
                                </Text>
                                <Text fontSize="sm" fontWeight="medium" color="gray.900">
                                    {email}
                                </Text>
                            </Box>
                        </Stack>

                        <HStack gap={3} mt={2}>
                            <DialogActionTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    flex={1}
                                    size="md"
                                    colorPalette="gray"
                                >
                                    キャンセル
                                </Button>
                            </DialogActionTrigger>
                            <Button
                                bg="red.500"
                                color="white"
                                onClick={onConfirm}
                                flex={1}
                                size="md"
                                _hover={{ bg: "red.600" }}
                            >
                                削除する
                            </Button>
                        </HStack>
                    </Stack>
                </DialogBody>
            </DialogContent>
        </DialogRoot>
    );
};