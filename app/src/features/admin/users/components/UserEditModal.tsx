import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Field,
    HStack,
    Stack,
    Text,
    Badge,
    Portal,
    NativeSelect,
} from "@chakra-ui/react";
import {
    DialogActionTrigger,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "../types/types";

type Props = {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (userId: string, data: Partial<User>) => Promise<void>;
};

export const UserEditModal = ({ user, open, onOpenChange, onSave }: Props) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [loading, setLoading] = useState(false);

    // モーダルが開いた時に初期値をセット（名前関連を削除）
    useEffect(() => {
        if (user) {
            setFormData({
                role: user.role,
                status: user.status,
                departments: { ...user.departments },
            });
        }
    }, [user, open]);

    if (!user) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(user.email, formData);
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogRoot
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
            motionPreset="slide-in-bottom"
        >
            <Portal>
                <DialogContent borderRadius="xl" boxShadow="2xl">
                    <DialogHeader borderBottomWidth="1px" borderColor="gray.100" pb={4}>
                        <DialogTitle fontSize="lg">ユーザー権限・状態の編集</DialogTitle>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                            ID: {user.email}
                        </Text>
                    </DialogHeader>

                    <DialogBody py={6}>
                        <Stack gap={6}>
                            {/* 基本情報（表示のみ） */}
                            <Box p={4} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderColor="purple.500">
                                <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>対象アカウント</Text>
                                <Text fontWeight="bold" fontSize="md" color="gray.800">
                                    {user.email}
                                </Text>
                            </Box>

                            {/* 名前編集フィールドは完全に削除しました */}

                            {/* 権限設定 */}
                            <Field.Root>
                                <HStack justify="space-between" mb={1}>
                                    <Field.Label fontSize="sm" mb={0}>権限ロール</Field.Label>
                                    <Badge size="sm" variant="subtle" colorPalette="purple">
                                        現在: {user.role === "admin" ? "管理者" : "一般"}
                                    </Badge>
                                </HStack>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    >
                                        <option value="user">一般ユーザー (User)</option>
                                        <option value="admin">管理者 (Admin)</option>
                                    </NativeSelect.Field>
                                </NativeSelect.Root>
                            </Field.Root>

                            {/* ステータス設定 */}
                            <Field.Root>
                                <HStack justify="space-between" mb={1}>
                                    <Field.Label fontSize="sm" mb={0}>アカウント状態</Field.Label>
                                    <Badge
                                        size="sm"
                                        colorPalette={user.status === "ACTIVE" ? "green" : "red"}
                                    >
                                        現在: {user.status === "ACTIVE" ? "有効" : "無効"}
                                    </Badge>
                                </HStack>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="ACTIVE">有効 (Active)</option>
                                        <option value="INACTIVE">無効化 (Inactive)</option>
                                        <option value="LOCKED">ロック (Locked)</option>
                                    </NativeSelect.Field>
                                </NativeSelect.Root>
                                <Field.HelperText fontSize="xs">
                                    無効にするとシステムへのログインができなくなります
                                </Field.HelperText>
                            </Field.Root>
                        </Stack>
                    </DialogBody>

                    <DialogFooter borderTopWidth="1px" borderColor="gray.100" pt={4}>
                        <DialogActionTrigger asChild>
                            <Button variant="ghost" disabled={loading}>キャンセル</Button>
                        </DialogActionTrigger>
                        <Button
                            colorPalette="blue"
                            loading={loading}
                            onClick={handleSave}
                            px={8}
                        >
                            変更を保存
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </Portal>
        </DialogRoot>
    );
};