import { useState, useMemo } from "react";
import { Box, Container, Text } from "@chakra-ui/react";
import { useUsers} from "@/features/admin/users/hooks/useAdminUsers";
import { UserAdminHeader } from "@/features/admin/users/components/UserAdminHeader";
import { UserAdminTableHeader } from "@/features/admin/users/components/UserAdminTableHeader.tsx";
import { UserAdminTable } from "@/features/admin/users/components/UserAdminTable";
import { UserAdminTableSkeleton } from "@/features/admin/users/components/UserAdminTableSkeleton";
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

    const { data, isLoading: isQueryLoading, isError, error } = useUsers();

    const users = data?.users ?? [];

    const isLoading = isQueryLoading;

    const filteredAndSortedUsers = useMemo(
        () => filterAndSortUsers(users, filterText, filters),
        [users, filterText, filters]
    );

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
                {isLoading ? (
                    <UserAdminTableSkeleton />
                ) : (
                    <UserAdminTable
                        users={filteredAndSortedUsers}/>
                )}
            </Box>
        </Container>
    );
};