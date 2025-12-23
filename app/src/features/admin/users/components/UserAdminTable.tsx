import { useState, useEffect } from "react";
import {
    Flex,
    Text,
    Table,
    Badge,
    HStack,
    IconButton,
    Menu,
    Button,
} from "@chakra-ui/react";
import {
    PiDotsThreeOutline,
    PiPencilSimple,
    PiTrash,
    PiCaretLeft,
    PiCaretRight
} from "react-icons/pi";
import { Avatar } from "@/components/ui/avatar";
import type { User } from "@/features/admin/users/types/types";
import { UserEditModal } from "@/features/admin/users/components/UserEditModal";
import { DeleteConfirmDialog } from "@/features/admin/users/components/DeleteConfirmDialog"; // ★追加
import { useUpdateUser, useDeleteUser } from "@/features/admin/users/hooks/useAdminUsers";

// --- サブコンポーネント ---
const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; label: string }> = {
        ACTIVE: { color: "green", label: "有効" },
        INACTIVE: { color: "gray", label: "無効" },
        LOCKED: { color: "red", label: "ロック" },
    };
    const { color, label } = config[status] || { color: "gray", label: status };
    return <Badge colorPalette={color} variant="solid" px={2}>{label}</Badge>;
};

const RoleBadge = ({ role }: { role: string }) => {
    const config: Record<string, { color: string; label: string }> = {
        admin: { color: "purple", label: "管理者" },
        user: { color: "blue", label: "一般" },
    };
    const { color, label } = config[role] || { color: "gray", label: role };
    return <Badge colorPalette={color} variant="subtle">{label}</Badge>;
};

const LastLoginDisplay = ({ date }: { date?: string }) => {
    if (!date) return <Badge variant="subtle" colorPalette="orange" size="sm">未ログイン</Badge>;
    return (
        <Text fontSize="sm" color="gray.600">
            {new Date(date).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
        </Text>
    );
};

const ITEMS_PER_PAGE = 20;

type UserAdminTableProps = {
    users: User[];
    onEditClick?: (user: User) => void;   // 親で何か処理したい場合（任意）
    onDeleteClick?: (email: string) => void; // 親で何か処理したい場合（任意）
};

// 引数に onDeleteClick を追加
export const UserAdminTable = ({ users, onEditClick, onDeleteClick }: UserAdminTableProps) => {

   const [currentPage, setCurrentPage] = useState(1);

    // モーダル・ダイアログの状態管理
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    // ページネーション計算
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
    }, [users.length, totalPages, currentPage]);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentUsers = users.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const rangeStart = users.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = Math.min(startIndex + ITEMS_PER_PAGE, users.length);

    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

    // --- 各操作のハンドラー ---
    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditOpen(true);
        onEditClick?.(user);
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user); // 削除対象をセット
        setIsDeleteOpen(true); // ダイアログを開く
        onDeleteClick?.(user.email);
    };

    const handleConfirmDelete = async () => {
        if (selectedUser) {
            await deleteMutation.mutateAsync(selectedUser.email);
            setIsDeleteOpen(false);
        }
    };

    const handleSave = async (email: string, data: Partial<User>) => {
        await updateMutation.mutateAsync({ email: email, data });
    };

    return (
        <>
            <Table.Root size="md" interactive>
                <Table.Header bg="gray.50">
                    <Table.Row>
                        <Table.ColumnHeader py={4}>メールアドレス</Table.ColumnHeader>
                        <Table.ColumnHeader>所属部署</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">権限</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">ステータス</Table.ColumnHeader>
                        <Table.ColumnHeader>最終ログイン</Table.ColumnHeader>
                        <Table.ColumnHeader width="50px"></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {currentUsers.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={6} textAlign="center" py={10} color="gray.500">
                                該当するユーザーが見つかりません
                            </Table.Cell>
                        </Table.Row>
                    ) : (
                        currentUsers.map((user) => (
                            // ★ key を email に変更 (Warning 対策)
                            <Table.Row key={user.email} _hover={{ bg: "gray.50/50" }}>
                                <Table.Cell>
                                    <HStack gap={3}>
                                        <Avatar size="sm" name={user.email} />
                                        <Text fontWeight="bold" fontSize="sm">{user.email}</Text>
                                    </HStack>
                                </Table.Cell>

                                <Table.Cell>
                                    <Flex gap={2} wrap="wrap">
                                        {user.departments && Object.values(user.departments).length > 0 ? (
                                            Object.values(user.departments).map((name) => (
                                                <Badge key={name} colorPalette="gray" variant="surface" size="xs">
                                                    {name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">-</Text>
                                        )}
                                    </Flex>
                                </Table.Cell>

                                <Table.Cell textAlign="center"><RoleBadge role={user.role} /></Table.Cell>
                                <Table.Cell textAlign="center"><StatusBadge status={user.status} /></Table.Cell>
                                <Table.Cell><LastLoginDisplay date={user.last_login_at} /></Table.Cell>

                                <Table.Cell>
                                    <Menu.Root positioning={{ placement: "bottom-end" }}>
                                        <Menu.Trigger asChild>
                                            <IconButton aria-label="Options" variant="ghost" size="sm" color="gray.500">
                                                <PiDotsThreeOutline size={20} />
                                            </IconButton>
                                        </Menu.Trigger>
                                        <Menu.Positioner>
                                            <Menu.Content minW="140px">
                                                <Menu.Item value="edit" onClick={() => handleEditClick(user)}>
                                                    <PiPencilSimple /> 編集
                                                </Menu.Item>
                                                <Menu.Item
                                                    value="delete"
                                                    color="red.500"
                                                    onClick={() => handleDeleteClick(user)}
                                                >
                                                    <PiTrash /> 削除
                                                </Menu.Item>
                                            </Menu.Content>
                                        </Menu.Positioner>
                                    </Menu.Root>
                                </Table.Cell>
                            </Table.Row>
                        ))
                    )}
                </Table.Body>
            </Table.Root>

            <Flex p={4} justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.100" bg="white">
                <Text fontSize="xs" color="gray.500">
                    全 {users.length} 件中 {rangeStart} - {rangeEnd} 件を表示
                </Text>
                {users.length > ITEMS_PER_PAGE && (
                    <HStack gap={2}>
                        <Button size="xs" variant="outline" onClick={handlePrev} disabled={currentPage === 1}>
                            <PiCaretLeft /> 前へ
                        </Button>
                        <Button size="xs" variant="outline" onClick={handleNext} disabled={currentPage >= totalPages}>
                            次へ <PiCaretRight />
                        </Button>
                    </HStack>
                )}
            </Flex>

            {/* 編集モーダル */}
            <UserEditModal
                user={selectedUser}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSave={handleSave}
            />

            {/* ★削除確認ダイアログ */}
            <DeleteConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                email={selectedUser?.email || ""}
            />
        </>
    );
};