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
    Button
} from "@chakra-ui/react";
import {
    PiDotsThreeOutline,
    PiPencilSimple,
    PiTrash,
    PiCaretLeft,  // 追加: ページ送りアイコン
    PiCaretRight  // 追加: ページ送りアイコン
} from "react-icons/pi";
import { Avatar } from "@/components/ui/avatar";
import type { User } from "@/features/admin/users/types/types";

// --- 内部用サブコンポーネント (そのまま維持) ---

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

// --- メインコンポーネント ---

type Props = {
    users: User[];
};

const ITEMS_PER_PAGE = 20;

export const UserAdminTable = ({ users }: Props) => {
    // --- ページネーション用ロジック ---
    const [currentPage, setCurrentPage] = useState(1);

    // 検索などで母数が変わったら1ページ目に戻す
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [users.length, totalPages, currentPage]);

    // 表示データの計算
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentUsers = users.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // フッター表示用の件数
    const rangeStart = users.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = Math.min(startIndex + ITEMS_PER_PAGE, users.length);

    // ページ切り替え関数
    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

    // --- 表示用ヘルパー ---
    const getFullName = (user: User) => `${user.family_name} ${user.given_name}`;

    const getDepartmentBadges = (departments: Record<string, string>) => {
        return Object.entries(departments).map(([code, name]) => (
            <Badge
                key={code}
                colorPalette="gray"
                variant="surface"
                fontWeight="normal"
                fontSize="xs"
            >
                {name}
            </Badge>
        ));
    };

    return (
        <>
            <Table.Root size="md" interactive>
                <Table.Header bg="gray.50">
                    <Table.Row>
                        <Table.ColumnHeader py={4}>氏名 / メール</Table.ColumnHeader>
                        <Table.ColumnHeader>部署</Table.ColumnHeader>
                        <Table.ColumnHeader>権限</Table.ColumnHeader>
                        <Table.ColumnHeader>ステータス</Table.ColumnHeader>
                        <Table.ColumnHeader>更新日時</Table.ColumnHeader>
                        <Table.ColumnHeader width="50px"></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {/* currentUsers (20件分) を回す */}
                    {currentUsers.map((user) => (
                        <Table.Row key={user.user_id} _hover={{ bg: "gray.50" }}>

                            {/* 1. 氏名・メール */}
                            <Table.Cell>
                                <HStack gap={3}>
                                    <Avatar size="sm" name={getFullName(user)} />
                                    <Box>
                                        <Text fontWeight="bold" fontSize="sm">
                                            {getFullName(user)}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {user.email}
                                        </Text>
                                    </Box>
                                </HStack>
                            </Table.Cell>

                            {/* 2. 部署 */}
                            <Table.Cell>
                                <Flex gap={2} wrap="wrap">
                                    {Object.keys(user.departments).length > 0 ? (
                                        getDepartmentBadges(user.departments)
                                    ) : (
                                        <Text fontSize="xs" color="gray.400">-</Text>
                                    )}
                                </Flex>
                            </Table.Cell>

                            {/* 3. 権限・ステータス・日付 */}
                            <Table.Cell><RoleBadge role={user.role} /></Table.Cell>
                            <Table.Cell><StatusBadge status={user.status} /></Table.Cell>
                            <Table.Cell>
                                <Text fontSize="sm" color="gray.600">
                                    {new Date(user.updated_at).toLocaleString("ja-JP")}
                                </Text>
                            </Table.Cell>

                            {/* 4. アクションメニュー */}
                            <Table.Cell>
                                <Menu.Root positioning={{ placement: "bottom-end" }}>
                                    <Menu.Trigger asChild>
                                        <IconButton aria-label="Options" variant="ghost" size="sm" color="gray.500">
                                            <PiDotsThreeOutline size={20} />
                                        </IconButton>
                                    </Menu.Trigger>
                                    <Menu.Positioner>
                                        <Menu.Content minW="140px">
                                            <Menu.Item value="edit">
                                                <PiPencilSimple /> 編集
                                            </Menu.Item>
                                            <Menu.Item value="delete" color="red.500">
                                                <PiTrash /> 削除
                                            </Menu.Item>
                                        </Menu.Content>
                                    </Menu.Positioner>
                                </Menu.Root>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            {/* フッター */}
            <Flex p={4} justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.100">
                <Text fontSize="xs" color="gray.500">
                    全 {users.length} 件中 {rangeStart} - {rangeEnd} 件を表示
                </Text>

                {/* 20件より多いときだけボタンを表示 */}
                {users.length > ITEMS_PER_PAGE && (
                    <HStack gap={2}>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                        >
                            <PiCaretLeft /> 前へ
                        </Button>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={handleNext}
                            disabled={currentPage >= totalPages}
                        >
                            次へ <PiCaretRight />
                        </Button>
                    </HStack>
                )}
            </Flex>
        </>
    );
};