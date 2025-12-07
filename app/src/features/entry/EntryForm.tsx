import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Box, Spinner, VStack, Text } from "@chakra-ui/react";
import { useUserStore } from "@/stores/useUserStore";
import { api } from "@/lib/api";
import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";

// Hooks & Services
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";
import { buildConstructionPrompt } from "@/features/entry/services/promptBuilder";

// Components
import { ConstructionProject } from "@/features/entry/components/elements/ConstructionProject";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";
import { ImportantEquipment } from "@/features/entry/components/elements/ImportantEquipment";
import { SiteCondition } from "@/features/entry/components/elements/SiteCondition";
import {SubmitButton} from "@/features/entry/components/elements/SubmitButton.tsx";

export const EntryForm = () => {
    const navigate = useNavigate();

    const {
        tenantId,
        setUserData,
        isLoading: isUserLoading,
        setLoading
    } = useUserStore();

    const { constructions, environments, isLoading: isMasterLoading, error } = useConstructionMaster();

    // 状態管理
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);

    // 送信中のローディング状態
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 初期化処理
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

    // ──────────────────────────────────────────
    // 送信ハンドラ (API連携)
    // ──────────────────────────────────────────
    const handleSubmit = async () => {
        // バリデーション (簡易)
        if (selectedTypeIds.length === 0 || selectedProcessIds.length === 0) {
            alert("【入力不足】\n工事種別と工程を選択してください。");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. プロンプト生成
            const promptText = buildConstructionPrompt({
                date,
                constructions, // constructionsを渡す
                environments,
                selectedTypeIds,
                selectedProcessIds,
                selectedEnvIds
            });

            console.log("Sending Prompt:", promptText);

            // 2. API送信 (Producer Lambdaへ)
            // ※エンドポイントは '/jobs' や '/prediction' などAPI Gatewayの設定に合わせてください
            // ここでは '/jobs' と仮定しています
            const res = await api.post('/jobs', {
                message: promptText
            });

            const { job_id: jobId } = res.data;

            if (!jobId) {
                throw new Error("Job ID not returned");
            }

            // 3. 結果画面へ遷移 (Job IDを持っていく)
            navigate(`/result/${jobId}`);

        } catch (e) {
            console.error("Submission failed:", e);
            // ★変更: toast -> alert
            alert("【送信エラー】\nサーバーへの送信に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
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
        <Box maxW="600px" mx={"auto"} pb={10}>
            <VStack gap={8} align="stretch">
                <ConstructionDate value={date} onChange={setDate} />

                <ConstructionProject
                    masterCategories={constructions}
                    selectedTypeIds={selectedTypeIds}
                    onChange={setSelectedTypeIds}
                />

                <ConstructionProcess
                    masterCategories={constructions}
                    targetTypeIds={selectedTypeIds}
                    value={selectedProcessIds}
                    onChange={setSelectedProcessIds}
                />
                <ImportantEquipment
                    masterCategories={constructions}
                    selectedProcessIds={selectedProcessIds}
                />

                <SiteCondition
                    masterEnvironments={environments}
                    value={selectedEnvIds}
                    onChange={setSelectedEnvIds}
                />

                <SubmitButton
                    onClick={handleSubmit}
                    loading={isSubmitting} // isLoading ではなく loading プロパティとして渡せます
                    loadingText="送信中..."
                >
                    登録内容を確認
                </SubmitButton>
            </VStack>
        </Box>
    );
};