import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";
import {useUserStore} from "@/stores/useUserStore.ts";
import {useEffect} from "react";
import {api} from "@/lib/api.ts";
import {Box, Code, Spinner, Text, VStack} from "@chakra-ui/react";

export const EntryForm = () => {
    const { tenantId, setUserData, isLoading, setLoading } = useUserStore();

    useEffect(() => {
        // 画面が開かれたらデータを取りに行く
        const fetchData = async () => {
            // すでにデータがあるなら再取得しない（無駄な通信削減）
            if (tenantId) return;

            setLoading(true);
            try {
                const response = await api.get('/me');

                // Storeに保存
                setUserData(response.data);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                alert("データ取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [tenantId, setUserData, setLoading]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    return (
        <div>
            <ConstructionDate />
            <VStack gap={6} align="start">
                <Box p={4} borderWidth={1} borderRadius="md" w="full" bg="gray.50">
                    <Text fontWeight="bold" mb={2}>Storeの中身確認:</Text>
                    <Text>テナントID: <Code>{tenantId}</Code></Text>
                    <Text>ユーザーID: <Code>{useUserStore.getState().userId}</Code></Text>
                    <Text>部署: <Code>{useUserStore.getState().departments.map(dept => `${dept.id}: ${dept.name}`).join(', ')}</Code></Text>

                </Box>
            </VStack>
        </div>
    );
};
