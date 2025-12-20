import {
    DialogRoot,
    DialogContent,
    DialogBody,
    DialogBackdrop,
    VStack,
    Text,
    Spinner,
    Portal,
} from "@chakra-ui/react";

export const ProcessingModal = ({ isOpen, status }: { isOpen: boolean; status: string }) => {
    return (
        <DialogRoot
            open={isOpen}
            // placement="center" は削除または上書き
            closeOnInteractOutside={false}
            closeOnEscape={false}
        >
            <Portal>
                <DialogBackdrop bg="blackAlpha.400" backdropFilter="blur(4px)" />
                <DialogContent
                    bg="transparent"
                    shadow="none"
                    border="none"
                    maxW="xs"
                    position="fixed"
                    // ★ ここで位置を調整
                    top="35%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                >
                    <DialogBody py={10}>
                        <VStack gap={6}>
                            {/* スピナー自体の色も少し強く */}
                            <Spinner color="orange.400" size="xl" borderWidth="4px" />

                            <VStack gap={2} textAlign="center">
                                {/* メインテキスト：サイズを大きくし、文字の影（textShadow）で浮き立たせる */}
                                <Text
                                    color="white"
                                    fontWeight="black"
                                    fontSize="2xl"
                                    letterSpacing="wider"
                                    textShadow="0 2px 10px rgba(0,0,0,0.5)" // ★影をつけて文字の輪郭をはっきりさせる
                                >
                                    解析中...
                                </Text>

                                <Text
                                    mt={4}
                                    color="orange.200"
                                    fontSize="xs"
                                    textTransform="uppercase"
                                    letterSpacing="widest"
                                >
                                    {status}
                                </Text>
                            </VStack>
                        </VStack>
                    </DialogBody>
                </DialogContent>
            </Portal>
        </DialogRoot>
    );
};