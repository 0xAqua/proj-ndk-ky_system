import { Box, Container, Flex, Spinner, Text } from "@chakra-ui/react";
import { useUsers } from "@/features/admin/users/hooks/useAdminUsers";
import { UserAdminHeader } from "@/features/admin/users/components/UserAdminHeader";
import { UserAdminFilters } from "@/features/admin/users/components/UserAdminFilters";
import { UserAdminTable } from "@/features/admin/users/components/UserAdminTable";

export const UserAdminForm = () => {
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

    return (
        <Container maxW="container.xl" p={0}>
            <UserAdminHeader />
            <UserAdminFilters />
            <Box
                bg="white"
                borderRadius="xl"
                shadow="sm"
                overflow="hidden"
                border="1px solid"
                borderColor="gray.100"
            >
                <UserAdminTable users={data?.users ?? []} />
            </Box>
        </Container>
    );
};