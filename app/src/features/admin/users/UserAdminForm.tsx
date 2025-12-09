import {Box, Container} from "@chakra-ui/react";
import {MOCK_USERS_DATA} from "@/features/admin/users/data/mockUsers";
import {UserAdminHeader} from "./components/UserAdminHeader";
import {UserAdminFilters} from "./components/UserAdminFilters";
import {UserAdminTable} from "./components/UserAdminTable";

export const UserAdminForm = () => {
    // 将来的にはここでAPIからデータを取得 (useQueryなど)
    // const { data: users, isLoading } = useUsers();
    return (
        <Container maxW="container.xl" p={0}>

            {/* 1. ヘッダーエリア */}
            <UserAdminHeader />

            {/* 2. フィルターエリア */}
            <UserAdminFilters />

            {/* 3. テーブルエリア（データを渡すだけ） */}
            <Box bg="white" borderRadius="xl" shadow="sm" overflow="hidden" border="1px solid" borderColor="gray.100">
                <UserAdminTable users={MOCK_USERS_DATA} />
            </Box>

        </Container>
    );
};