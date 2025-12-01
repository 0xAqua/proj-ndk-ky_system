import { useState, useEffect } from "react";
import { Box, Spinner, VStack, Button } from "@chakra-ui/react";
import { useUserStore } from "@/stores/useUserStore";
import { api } from "@/lib/api";

import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";

export const EntryForm = () => {
    // Storeからはユーザー情報だけを取る
    const { tenantId, setUserData, isLoading, setLoading } = useUserStore();

    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

    useEffect(() => {
        const initData = async () => {
            if (tenantId) return;

            setLoading(true);
            try {
                // ユーザー情報取得 (s1)
                const userRes = await api.get('/me');
                setUserData(userRes.data);

                // ★s2 (マスタ) の取得はここではやらない！
                // 子コンポーネント (ConstructionProcess) に任せる

            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        void initData();
    }, [tenantId, setUserData, setLoading]);

    const handleSubmit = () => {
        console.log("送信データ:", { date, selectedProcesses });
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" color="blue.500" />
            </Box>
        );
    }

    return (
        <Box maxW="600px" mx="auto" p={4}>
            <VStack gap={6} align="stretch">
                <ConstructionDate value={date} onChange={setDate} />

                <ConstructionProcess
                    value={selectedProcesses}
                    onChange={setSelectedProcesses}
                />

                <Button colorScheme="blue" onClick={handleSubmit} mt={4}>
                    登録内容を確認
                </Button>
            </VStack>
        </Box>
    );
};