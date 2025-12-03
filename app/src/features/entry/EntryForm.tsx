import { useState, useEffect } from "react";
import { Box, Spinner, VStack, Button, Text } from "@chakra-ui/react";
import { useUserStore } from "@/stores/useUserStore";
import { api } from "@/lib/api";
import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";

// Hooks
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";

// Components
// ※ファイル名はご自身の環境に合わせてください (ConstructionWorkUi -> ConstructionProject の場合あり)
import { ConstructionProject } from "@/features/entry/components/elements/ConstructionProject";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";
import { ImportantEquipment } from "@/features/entry/components/elements/ImportantEquipment";
import { SiteCondition } from "@/features/entry/components/elements/SiteCondition"; // ★追加: 現場状況

export const EntryForm = () => {
    const {
        tenantId,
        setUserData,
        isLoading: isUserLoading,
        setLoading
    } = useUserStore();

    // ★修正ポイント: categories ではなく constructions と environments を受け取る
    const { constructions, environments, isLoading: isMasterLoading, error } = useConstructionMaster();

    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]); // ★追加: 現場状況用

    useEffect(() => {
        if (tenantId) return;

        const initData = async () => {
            setLoading(true);
            try {
                const userRes = await api.get('/me');
                if (userRes.data) {
                    setUserData(userRes.data);
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };

        void initData();
    }, []);

    const handleSubmit = () => {
        const payload = {
            date,
            constructionTypes: selectedTypeIds,
            processes: selectedProcessIds,
            environments: selectedEnvIds // ★追加
        };
        console.log("送信データ:", payload);
    };

    if (isUserLoading || isMasterLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" color="blue.500" />
                <Text ml={4}>データを読み込んでいます...</Text>
            </Box>
        );
    }

    if (error) {
        return <Box color="red.500" p={10}>エラー: {error}</Box>;
    }

    return (
        <Box maxW="600px" mx="auto" pb={10}>
            <VStack gap={6} align="stretch">

                {/* 1. 日付選択 */}
                <ConstructionDate value={date} onChange={setDate} />

                {/* 2. 工事種別選択 */}
                <ConstructionProject
                    masterCategories={constructions} // ★修正: constructions を渡す
                    selectedTypeIds={selectedTypeIds}
                    onChange={setSelectedTypeIds}
                />

                {/* 工事種別が選択されていれば表示 */}
                {selectedTypeIds.length > 0 && (
                    <>
                        {/* 3. 工事工程選択 */}
                        <ConstructionProcess
                            masterCategories={constructions} // ★修正: constructions を渡す
                            targetTypeIds={selectedTypeIds}
                            value={selectedProcessIds}
                            onChange={setSelectedProcessIds}
                        />

                        {/* 4. 注意が必要な機材 */}
                        <ImportantEquipment
                            masterCategories={constructions} // ★修正: constructions を渡す
                            selectedProcessIds={selectedProcessIds}
                        />
                    </>
                )}

                {/* 5. 現場状況・環境 (ここに追加) */}
                <SiteCondition
                    masterEnvironments={environments} // ★環境データを渡す
                    value={selectedEnvIds}
                    onChange={setSelectedEnvIds}
                />

                <Button colorScheme="blue" onClick={handleSubmit} mt={4} size="lg">
                    登録内容を確認
                </Button>
            </VStack>
        </Box>
    );
};