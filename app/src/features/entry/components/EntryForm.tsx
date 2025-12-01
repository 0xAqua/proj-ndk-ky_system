import { useState, useEffect } from "react";
import { Box, Spinner, VStack, Button, Text } from "@chakra-ui/react";
import { useUserStore } from "@/stores/useUserStore";
import { api } from "@/lib/api";
import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";

export const EntryForm = () => {
    const {
        tenantId,
        setUserData,
        isLoading,
        setLoading
    } = useUserStore();

    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

    useEffect(() => {
        // データが既に揃っているなら何もしない
        if (tenantId) return;

        const initData = async () => {
            setLoading(true);
            try {
                // ★高速化: Promise.all で並列実行！
                // 「ユーザー情報」と「マスタデータ」を同時に取りに行く
                const [userRes] = await Promise.all([
                    // 1. ユーザー情報 (s1)
                    // すでにStoreにあればスキップ、なければ取得
                    !tenantId ? api.get('/me') : Promise.resolve({ data: null }),

                ]);

                // 取得できたものだけStoreにセット
                if (userRes.data) {
                    console.log("User Data Loaded");
                    setUserData(userRes.data);
                }

            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        void initData();
    }, []); // 依存配列を空にして、初回マウント時のみ走るようにする

    const handleSubmit = () => {
        console.log("送信データ:", { date, selectedProcesses });
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" color="blue.500" />
                <Text ml={4}>データを読み込んでいます...</Text>
            </Box>
        );
    }

    return (
        <Box maxW="600px" mx="auto" p={4}>
            <VStack gap={6} align="stretch">
                <ConstructionDate value={date} onChange={setDate} />
                <ConstructionProcess value={selectedProcesses} onChange={setSelectedProcesses} />
                <Button colorScheme="blue" onClick={handleSubmit} mt={4}>
                    登録内容を確認
                </Button>
            </VStack>
        </Box>
    );
};