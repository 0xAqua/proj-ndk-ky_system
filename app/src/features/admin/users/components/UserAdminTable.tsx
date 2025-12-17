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
} from "react-icons/pi";
import { Avatar } from "@/components/ui/avatar";
import type { User } from "@/features/admin/users/types/types";

// --- 内部用サブコンポーネント ---

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

export const UserAdminTable = ({ users }: Props) => {
    // 氏名を結合して表示
    const getFullName = (user: User) => `${user.family_name} ${user.given_name}`;

    // 部署をBadge配列に変換
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
                    {users.map((user) => (
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
                    全 {users.length} 件中 1 - {users.length} 件を表示
                </Text>
                <HStack>
                    <Button size="xs" variant="outline" disabled>前へ</Button>
                    <Button size="xs" variant="outline" disabled>次へ</Button>
                </HStack>
            </Flex>
        </>
    );
};
