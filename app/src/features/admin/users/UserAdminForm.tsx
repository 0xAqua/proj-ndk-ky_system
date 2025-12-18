import { useState, useMemo } from "react";
import { Box, Container, Flex, Spinner, Text } from "@chakra-ui/react";
import { useUsers, useDeleteUser } from "@/features/admin/users/hooks/useAdminUsers";
import { UserAdminHeader } from "@/features/admin/users/components/UserAdminHeader";
import { UserAdminTableHeader } from "@/features/admin/users/components/UserAdminTableHeader.tsx";
import { UserAdminTable } from "@/features/admin/users/components/UserAdminTable";
import { DeleteConfirmDialog } from "@/features/admin/users/components/DeleteConfirmDialog";
import { useNotification } from "@/hooks/useNotification";
import type { FilterConditions } from "@/features/admin/users/components/UserAdminFilterModal";
import { filterAndSortUsers } from "@/features/admin/users/utils/userFilters";

export const UserAdminForm = () => {
    const [filterText, setFilterText] = useState("");
    const [filters, setFilters] = useState<FilterConditions>({
        status: [],
        departments: [],
        role: [],
        sortBy: undefined,
        sortOrder: undefined,
    });
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

    const { data, isLoading, isError, error } = useUsers();
    const { mutate: deleteUser } = useDeleteUser();
    const notify = useNotification();

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        deleteUser(deleteTarget.id);
        notify.success("ユーザーを削除しました");
        setDeleteTarget(null);
    };

    const users = data?.users ?? [];

    // フィルタリング＆ソート処理
    const filteredAndSortedUsers = useMemo(
        () => filterAndSortUsers(users, filterText, filters),
        [users, filterText, filters]
    );


    if (isLoading) {
        return (
            <Flex justify="center" align="center" minH="200px">
                <Spinner size="lg" color="blue.500" />
            </Flex>
        );
    }

    if (isError) {
        return (
            <Container maxW="container.xl" p={4}>
                <Text color="red.500">
                    ユーザー情報の取得に失敗しました: {error?.message}
                </Text>
            </Container>
        );
    }

    return (
        <Container maxW="container.xl" p={0}>
            <UserAdminHeader />
            <UserAdminTableHeader
                onSearch={(text) => setFilterText(text)}
                onFilterChange={(newFilters) => setFilters(newFilters)}
            />

            <Box
                bg="white"
                borderRadius="xl"
                shadow="sm"
                overflow="hidden"
                border="1px solid"
                borderColor="gray.100"
            >
                <UserAdminTable
                    users={filteredAndSortedUsers}
                    onDeleteClick={(id, email) => setDeleteTarget({ id, email })}
                />
            </Box>

            <DeleteConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                email={deleteTarget?.email || ""}
            />
        </Container>
    );
};