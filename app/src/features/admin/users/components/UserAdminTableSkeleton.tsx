import { Table, Skeleton, HStack, Box, Flex, IconButton, Button } from "@chakra-ui/react";
import { PiDotsThreeOutline, PiCaretLeft, PiCaretRight } from "react-icons/pi";

export const UserAdminTableSkeleton = () => {
    const rows = Array.from({ length: 4 });

    return (
        <>
            <Table.Root size="md">
                <Table.Header bg="gray.50">
                    <Table.Row>
                        <Table.ColumnHeader py={4}>名前 / メール</Table.ColumnHeader>
                        <Table.ColumnHeader>部署</Table.ColumnHeader>
                        <Table.ColumnHeader>権限</Table.ColumnHeader>
                        <Table.ColumnHeader>ステータス</Table.ColumnHeader>
                        <Table.ColumnHeader>更新日時</Table.ColumnHeader>
                        <Table.ColumnHeader width="50px"></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rows.map((_, i) => (
                        <Table.Row key={i}>
                            <Table.Cell>
                                <HStack gap={3}>
                                    <Skeleton width="10" height="10" borderRadius="full" />
                                    <Box flex="1">
                                        <Skeleton height="4" width="24" mb="1" />
                                        <Skeleton height="3" width="32" />
                                    </Box>
                                </HStack>
                            </Table.Cell>
                            <Table.Cell><Skeleton height="5" width="16" borderRadius="sm" /></Table.Cell>
                            <Table.Cell><Skeleton height="5" width="12" borderRadius="sm" /></Table.Cell>
                            <Table.Cell><Skeleton height="5" width="14" borderRadius="sm" /></Table.Cell>
                            <Table.Cell><Skeleton height="4" width="32" /></Table.Cell>
                            <Table.Cell>
                                <IconButton variant="ghost" size="sm" disabled color="gray.100">
                                    <PiDotsThreeOutline size={20} />
                                </IconButton>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>

            {/* フッターのSkeleton: UserAdminTableのフッターと構造を合わせる */}
            <Flex p={4} justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.100">
                {/* 件数表示部分 */}
                <Skeleton height="3" width="150px" />

                {/* ページネーションボタン部分 */}
                <HStack gap={2}>
                    <Button size="xs" variant="outline" disabled>
                        <PiCaretLeft /> 前へ
                    </Button>
                    <Button size="xs" variant="outline" disabled>
                        次へ <PiCaretRight />
                    </Button>
                </HStack>
            </Flex>
        </>
    );
};