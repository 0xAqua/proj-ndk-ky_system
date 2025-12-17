import { useState } from "react"; // 1. useStateをインポート
import { Box, Container, Flex, Spinner, Text } from "@chakra-ui/react";
import { useUsers } from "@/features/admin/users/hooks/useAdminUsers";
import { UserAdminHeader } from "@/features/admin/users/components/UserAdminHeader";
import { UserAdminFilters } from "@/features/admin/users/components/UserAdminFilters";
import { UserAdminTable } from "@/features/admin/users/components/UserAdminTable";

export const UserAdminForm = () => {
    // 2. 検索ワードを管理するStateを定義
    const [filterText, setFilterText] = useState("");

    const { data, isLoading, isError, error } = useUsers();

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

    // 3. フィルタリング処理（ここが重要！）
    const users = data?.users ?? [];

    const filteredUsers = users.filter((user) => {
        // 検索ワードが空なら全員表示
        if (!filterText) return true;

        const search = filterText.toLowerCase(); // 大文字小文字を無視するために変換

        const fullName = `${user.family_name}${user.given_name}`;

        return (
            fullName.includes(filterText) ||
            user.email.toLowerCase().includes(search)
        );
    });

    return (
        <Container maxW="container.xl" p={0}>
            <UserAdminHeader />

            {/* 4. ここで setFilterText を渡す（これで検索窓とつながります） */}
            <UserAdminFilters onSearch={(text) => setFilterText(text)} />

            <Box
                bg="white"
                borderRadius="xl"
                shadow="sm"
                overflow="hidden"
                border="1px solid"
                borderColor="gray.100"
            >
                {/* 5. 全件(users)ではなく、絞り込んだ結果(filteredUsers)を渡す */}
                <UserAdminTable users={filteredUsers} />
            </Box>
        </Container>
    );
};