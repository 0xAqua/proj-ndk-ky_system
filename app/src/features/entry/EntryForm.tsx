import { useState, useEffect } from "react";
import { Box, Spinner, VStack, Button, Text } from "@chakra-ui/react";
import { useUserStore } from "@/stores/useUserStore";
import { api } from "@/lib/api";
import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";


import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";
import { ConstructionProject } from "@/features/entry/components/elements/ConstructionProject";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";

export const EntryForm = () => {
    // ユーザー情報ストア
    // isLoadingの名前が被るので isUserLoading にリネーム
    const {
        tenantId,
        setUserData,
        isLoading: isUserLoading,
        setLoading
    } = useUserStore();

    // ★追加: 工事マスタ取得フック
    // isLoadingの名前が被るので isMasterLoading にリネーム
    const { categories, isLoading: isMasterLoading, error } = useConstructionMaster();

    // 状態管理
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]); // ★追加: 工事種別ID
    const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]); // 名称変更: selectedProcesses -> selectedProcessIds

    useEffect(() => {
        if (tenantId) return;

        const initData = async () => {
            setLoading(true);
            try {
                // ユーザー情報のみ取得 (マスタはHooks側で勝手に取るのでここから削除してOK)
                const userRes = await api.get('/me');
                if (userRes.data) {
                    console.log("User Data Loaded");
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
        console.log("送信データ:", {
            date,
            constructionTypes: selectedTypeIds, // 工事種別
            processes: selectedProcessIds       // 工事工程
        });
    };

    // ユーザー情報またはマスタデータをロード中ならスピナーを表示
    if (isUserLoading || isMasterLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" color="blue.500" />
                <Text ml={4}>データを読み込んでいます...</Text>
            </Box>
        );
    }

    // マスタ取得エラー時の表示
    if (error) {
        return (
            <Box maxW="600px" mx="auto" mt={10} color="red.500">
                <Text>エラーが発生しました: {error}</Text>
            </Box>
        );
    }

    return (
        <Box maxW="600px" mx="auto">
            <VStack gap={6} align="stretch">
                {/* 日付選択 */}
                <ConstructionDate value={date} onChange={setDate} />

                {/* ★追加: 工事種別選択 */}
                <ConstructionProject
                    masterCategories={categories}
                    selectedTypeIds={selectedTypeIds}
                    onChange={(ids) => {
                        setSelectedTypeIds(ids);
                        // 必要であれば、種別が解除されたときに
                        // 紐づく工程ID (selectedProcessIds) を削除する処理をここに追加できます
                    }}
                />

                {/* ★変更: 工事工程選択 */}
                {/* 工事種別が選択されている場合のみ表示 */}
                {selectedTypeIds.length > 0 && (
                    <ConstructionProcess
                        masterCategories={categories}     // マスタデータ
                        targetTypeIds={selectedTypeIds}   // フィルタリング用ID
                        value={selectedProcessIds}        // 選択値
                        onChange={setSelectedProcessIds}  // 更新関数
                    />
                )}

                <Button colorScheme="blue" onClick={handleSubmit} mt={4}>
                    登録内容を確認
                </Button>
            </VStack>
        </Box>
    );
};