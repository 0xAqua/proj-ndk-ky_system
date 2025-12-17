import { useState } from "react";
import { Box, Container, Flex, Spinner, Text } from "@chakra-ui/react";
import { useUsers, useDeleteUser } from "@/features/admin/users/hooks/useAdminUsers";
import { UserAdminHeader } from "@/features/admin/users/components/UserAdminHeader";
import { UserAdminTableHeader } from "@/features/admin/users/components/UserAdminTableHeader.tsx";
import { UserAdminTable } from "@/features/admin/users/components/UserAdminTable";
import { DeleteConfirmDialog } from "@/features/admin/users/components/DeleteConfirmDialog";
import { useNotification } from "@/hooks/useNotification";

export const UserAdminForm = () => {
    const [filterText, setFilterText] = useState("");
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

    const users = data?.users ?? [];

    const filteredUsers = users.filter((user) => {
        if (!filterText) return true;
        const search = filterText.toLowerCase();
        const fullName = `${user.family_name}${user.given_name}`;
        return (
            fullName.includes(filterText) ||
            user.email.toLowerCase().includes(search)
        );
    });

    return (
        <Container maxW="container.xl" p={0}>
            <UserAdminHeader />
            <UserAdminTableHeader onSearch={(text) => setFilterText(text)} />

            <Box
                bg="white"
                borderRadius="xl"
                shadow="sm"
                overflow="hidden"
                border="1px solid"
                borderColor="gray.100"
            >
                <UserAdminTable
                    users={filteredUsers}
                    onDeleteClick={(id, email) => setDeleteTarget({ id, email })}  // ← これを追加
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