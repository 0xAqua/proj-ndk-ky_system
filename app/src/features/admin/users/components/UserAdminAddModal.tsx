import { Button, Box, Input, Heading, VStack, HStack } from "@chakra-ui/react";
import { PiX } from "react-icons/pi";
import { Field } from "@/components/ui/field";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from "@/components/ui/dialog";

interface UserAdminAddModalProps {
    open: boolean;
    onClose: () => void;
}

export const UserAdminAddModal = ({ open, onClose }: UserAdminAddModalProps) => {
    const handleSubmit = () => {
        // ユーザー追加ロジック
        onClose();
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <Heading size="lg">ユーザーを追加</Heading>
                    <DialogCloseTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <PiX />
                        </Button>
                    </DialogCloseTrigger>
                </DialogHeader>

                <DialogBody>
                    <VStack gap={4} align="stretch">
                        {/* 姓 */}
                        <Field label="姓" required>
                            <Input placeholder="姓を入力" />
                        </Field>

                        {/* 名 */}
                        <Field label="名" required>
                            <Input placeholder="名を入力" />
                        </Field>

                        {/* Email */}
                        <Field label="Email" required>
                            <Input type="email" placeholder="email@example.com" />
                        </Field>

                        {/* Password */}
                        <Field label="パスワード" required>
                            <Input type="password" placeholder="パスワードを入力" />
                        </Field>

                        {/* Role */}
                        <Field label="権限" required>
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
                                <option value="">権限を選択</option>
                                <option value="admin">管理者</option>
                                <option value="user">一般ユーザー</option>
                            </Box>
                        </Field>
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <HStack gap={3}>
                        <Button variant="ghost" onClick={onClose}>
                            キャンセル
                        </Button>
                        <Button colorPalette="blue" onClick={handleSubmit}>
                            追加
                        </Button>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
