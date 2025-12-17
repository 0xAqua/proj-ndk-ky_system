import { Button, Box, Input, Heading, VStack, HStack } from "@chakra-ui/react";
import { PiX } from "react-icons/pi";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from "@/components/ui/dialog";

interface UserAdminFilterModalProps {
    open: boolean;
    onClose: () => void;
}

export const UserAdminFilterModal = ({ open, onClose }: UserAdminFilterModalProps) => {
    const handleApply = () => {
        // フィルター適用ロジック
        onClose();
    };

    const handleReset = () => {
        // フィルターリセットロジック
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <Heading size="lg">フィルター条件</Heading>
                    <DialogCloseTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <PiX />
                        </Button>
                    </DialogCloseTrigger>
                </DialogHeader>

                <DialogBody>
                    <VStack gap={6} align="stretch">
                        {/* ステータス */}
                        <Box>
                            <Heading size="sm" mb={3}>ステータス</Heading>
                            <Box
                                as="select"
                                w="full"
                                px={4}
                                py={2}
                                borderRadius="md"
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                fontSize="sm"
                            >
                                <option value="">全てのステータス</option>
                                <option value="active">有効</option>
                                <option value="inactive">無効</option>
                                <option value="locked">ロック中</option>
                            </Box>
                        </Box>

                        {/* 部署検索 */}
                        <Box>
                            <Heading size="sm" mb={3}>部署</Heading>
                            <Input
                                placeholder="部署名を入力..."
                                borderRadius="md"
                            />
                        </Box>

                        {/* 権限 */}
                        <Box>
                            <Heading size="sm" mb={3}>権限</Heading>
                            <Box
                                as="select"
                                w="full"
                                px={4}
                                py={2}
                                borderRadius="md"
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                fontSize="sm"
                            >
                                <option value=""></option>
                                <option value="admin">管理者</option>
                                <option value="user">一般ユーザー</option>
                            </Box>
                        </Box>
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <HStack gap={3}>
                        <Button variant="ghost" onClick={handleReset}>
                            リセット
                        </Button>
                        <Button colorScheme="blue" onClick={handleApply}>
                            適用
                        </Button>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
