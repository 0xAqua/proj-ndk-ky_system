import { useState, useEffect } from "react";
import {
    Box,
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
    if (!date) {
        return <Badge variant="subtle" colorPalette="orange" size="sm">未ログイン</Badge>;
    }
    return (
        <Text fontSize="sm" color="gray.600">
            {new Date(date).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}
        </Text>
    );
};

type Props = {
    users: User[];
    onDeleteClick: (userId: string, email: string) => void;
};

const ITEMS_PER_PAGE = 20;

export const UserAdminTable = ({ users }: Props) => {
    const [currentPage, setCurrentPage] = useState(1);

    // --- 追加: モーダル・更新・削除用の状態管理 ---
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    // ページネーション制御
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [users.length, totalPages, currentPage]);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentUsers = users.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const rangeStart = users.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = Math.min(startIndex + ITEMS_PER_PAGE, users.length);

    // --- ハンドラー ---
    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditOpen(true);
    };

    const handleDeleteClick = async (user: User) => {
        if (window.confirm(`${user.family_name} ${user.given_name} (${user.email}) を削除しますか？`)) {
            await deleteMutation.mutateAsync(user.user_id);
        }
    };

    const handleSave = async (userId: string, data: Partial<User>) => {
        // 更新APIを呼び出し。成功すると自動的に一覧が再取得されます。
        await updateMutation.mutateAsync({ userId, data });
    };

    const getFullName = (user: User) => `${user.family_name} ${user.given_name}`;

    return (
        <>
            <Table.Root size="md" interactive>
                <Table.Header bg="gray.50">
                    <Table.Row>
                        <Table.ColumnHeader py={4}>名前 / メール</Table.ColumnHeader>
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
                            <Table.Row key={user.user_id} _hover={{ bg: "gray.50/50" }}>
                                <Table.Cell>
                                    <HStack gap={3}>
                                        <Avatar size="sm" name={getFullName(user)} />
                                        <Box>
                                            <Text fontWeight="bold" fontSize="sm">{getFullName(user)}</Text>
                                            <Text fontSize="xs" color="gray.500">{user.email}</Text>
                                        </Box>
                                    </HStack>
                                </Table.Cell>

                                <Table.Cell>
                                    <Flex gap={2} wrap="wrap">
                                        {Object.values(user.departments).length > 0 ? (
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
                                                {/* 編集ハンドラーを紐付け */}
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

            {/* --- 編集モーダルの呼び出し --- */}
            <UserEditModal
                user={selectedUser}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSave={handleSave}
            />
        </>
    );
};