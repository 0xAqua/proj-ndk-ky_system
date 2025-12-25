import { Box, Button, Flex, VStack, Text, Icon, Checkbox } from "@chakra-ui/react";
import { PiWarningFill, PiSparkle, PiCheckCircle } from "react-icons/pi";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseTrigger,
    DialogActionTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    isSaving: boolean;
};

export const AIOutputConfirmDialog = ({ open, onOpenChange, onConfirm, isSaving }: Props) => {
    const [isAcknowledged, setIsAcknowledged] = useState(false);

    const handleConfirm = async () => {
        await onConfirm();
        setIsAcknowledged(false);
    };

    const handleOpenChange = (e: { open: boolean }) => {
        onOpenChange(e.open);
        if (!e.open) {
            setIsAcknowledged(false);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={handleOpenChange} size="lg">
            <DialogContent>
                <DialogHeader pb={2}>
                    <Flex align="center" gap={3}>
                        <Flex
                            align="center"
                            justify="center"
                            w={10}
                            h={10}
                            borderRadius="full"
                        >
                            <Icon as={PiSparkle} boxSize={5} color="orange.600" />
                        </Flex>
                        <DialogTitle fontSize="lg" fontWeight="bold">
                            AI出力設定の変更確認
                        </DialogTitle>
                    </Flex>
                </DialogHeader>

                <DialogBody>
                    <VStack gap={5} align="stretch">
                        <Text color="gray.600" lineHeight="tall">
                            AI出力設定を変更します。<br/>
                            この設定はAIの応答に影響しますが、
                            AIの特性上、出力を完全に制御することはできません。
                        </Text>

                        <Box
                            bg="orange.50"
                            p={5}
                        >
                            <Flex align="center" gap={2} mb={3}>
                                <Icon as={PiWarningFill} color="orange.500" boxSize={5} />
                                <Text fontWeight="semibold" color="orange.700" fontSize="sm">
                                    ご注意ください
                                </Text>
                            </Flex>
                            <VStack gap={2.5} align="stretch" pl={1}>
                                {[
                                    "AIの出力結果は設定通りになることを保証するものではありません",
                                    "検索結果やコンテキストにより、意図しない応答が生成される可能性があります",
                                    "出力内容の最終確認・運用管理はお客様の責任となります",
                                ].map((text, i) => (
                                    <Flex key={i} align="flex-start" gap={2}>
                                        <Box
                                            w={1.5}
                                            h={1.5}
                                            borderRadius="full"
                                            bg="orange.400"
                                            mt={2}
                                            flexShrink={0}
                                        />
                                        <Text fontSize="sm" color="gray.700" lineHeight="tall">
                                            {text}
                                        </Text>
                                    </Flex>
                                ))}
                            </VStack>
                        </Box>

                        <Box
                            p={4}
                            borderRadius="md"
                            bg={isAcknowledged ? "green.50" : "gray.50"}
                            border="1px solid"
                            borderColor={isAcknowledged ? "green.200" : "gray.200"}
                            transition="all 0.2s"
                            cursor="pointer"
                            _hover={{ borderColor: isAcknowledged ? "green.300" : "gray.300" }}
                        >
                            <Checkbox.Root
                                checked={isAcknowledged}
                                onCheckedChange={(e) => setIsAcknowledged(!!e.checked)}
                                colorPalette="green"
                                width="100%"
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label cursor="pointer">
                                    <Text fontSize="sm" fontWeight="medium" color={isAcknowledged ? "green.700" : "gray.600"}>
                                        上記の内容を理解し、設定を変更することに同意します
                                    </Text>
                                </Checkbox.Label>
                            </Checkbox.Root>
                        </Box>
                    </VStack>
                </DialogBody>

                <DialogFooter pt={4} gap={3}>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" size="md">
                            キャンセル
                        </Button>
                    </DialogActionTrigger>
                    <Button
                        colorPalette="orange"
                        size="md"
                        onClick={handleConfirm}
                        loading={isSaving}
                        disabled={!isAcknowledged}
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