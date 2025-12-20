import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, VStack, Text, useDisclosure } from "@chakra-ui/react";

// ★ カスタムクライアントとエンドポイント
import { api } from "@/lib/client";
import { ENDPOINTS } from "@/lib/endpoints";

// ★ 共通コンポーネント
import ConstructionDate from "@/features/entry/components/elements/ConstructionDate";
import { ConstructionProject } from "@/features/entry/components/elements/ConstructionProject";
import { ConstructionProcess } from "@/features/entry/components/elements/ConstructionProcess";
import { ImportantEquipment } from "@/features/entry/components/elements/ImportantEquipment";
import { SiteCondition } from "@/features/entry/components/elements/SiteCondition";
import { SubmitButton } from "@/features/entry/components/elements/SubmitButton";
import { SiteConditionConfirmModal } from "@/features/entry/components/elements/SiteConditionConfirmModal";

// ★ スケルトンとフック
import { EntryFormSkeleton } from "@/features/entry/components/elements/EntryFormSkeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";
import { buildConstructionPrompt } from "@/features/entry/services/promptBuilder";

/**
 * KYシステム 入力フォーム
 * 認可(Auth)とマスタ(Master)の状態を監視し、スケルトン表示を制御します
 */
export const EntryForm = () => {
    const navigate = useNavigate();
    const { open, onOpen, onClose } = useDisclosure();

    // 1. 認証と詳細プロフィール情報をキャッシュから取得
    const { user, isLoading: isAuthLoading } = useAuth();

    // 2. 部署名に基づいてフィルタリングされたマスタデータを取得
    const {
        constructions,
        environments,
        isLoading: isMasterLoading,
        error
    } = useConstructionMaster();

    // 状態管理 (ユーザー入力)
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ──────────────────────────────────────────
    // 送信ハンドラ (AI解析依頼)
    // ──────────────────────────────────────────
    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            // プロンプトの組み立て
            const promptText = buildConstructionPrompt({
                date,
                constructions,
                environments,
                selectedTypeIds,
                selectedProcessIds,
                selectedEnvIds
            });

            // API送信 (BFF経由でVQシステムへ)
            const res = await api.post(ENDPOINTS.JOBS.LIST, {
                message: promptText,
                tenant_id: user?.tenantId || user?.tenant_id // 両方のネストに対応
            });

            const { job_id: jobId } = res.data;
            if (!jobId) throw new Error("Job ID not returned");

            onClose();
            // 結果表示画面へ遷移 (ジョブIDを渡す)
            navigate('/result', { state: { jobId } });

        } catch (e) {
            console.error("Submission error:", e);
            alert("【送信エラー】\nサーバーへの送信に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ──────────────────────────────────────────
    // UIガード (スケルトン・エラー表示)
    // ──────────────────────────────────────────

    // 読み込み中：作成したスケルトンコンポーネントを表示
    if (isAuthLoading || isMasterLoading) {
        return <EntryFormSkeleton />;
    }

    // エラー発生時
    if (error) {
        return (
            <Box p={10} textAlign="center">
                <Text color="red.500" fontWeight="bold">エラーが発生しました: {error}</Text>
            </Box>
        );
    }

    // ──────────────────────────────────────────
    // メインコンテンツ
    // ──────────────────────────────────────────
    return (
        <Box maxW="600px" mx="auto" pb={10} px={4}>
            <VStack gap={8} align="stretch">
                <ConstructionDate value={date} onChange={setDate} />

                <ConstructionProject
                    masterCategories={constructions}
                    selectedTypeIds={selectedTypeIds}
                    onChange={(newTypeIds) => {
                        setSelectedTypeIds(newTypeIds);
                        setSelectedProcessIds([]); // 工事種別変更時に工程をリセット
                    }}
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
                    onClick={() => {
                        // 簡易バリデーション
                        if (selectedTypeIds.length === 0 || selectedProcessIds.length === 0) {
                            alert("工事種別と工程を選択してください。");
                            return;
                        }
                        onOpen();
                    }}
                    loading={isSubmitting}
                >
                    入力内容の確認
                </SubmitButton>

                {/* 確認用モーダル */}
                <SiteConditionConfirmModal
                    open={open}
                    onClose={onClose}
                    onSubmit={handleFinalSubmit}
                    isSubmitting={isSubmitting}
                    date={date}
                    constructions={constructions}
                    selectedTypeIds={selectedTypeIds}
                    selectedProcessIds={selectedProcessIds}
                    masterEnvironments={environments}
                    value={selectedEnvIds}
                />
            </VStack>
        </Box>
    );
};