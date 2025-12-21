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
import {useNotification} from "@/hooks/useNotification.ts";

/**
 * KYシステム 入力フォーム
 * 認可(Auth)とマスタ(Master)の状態を監視し、スケルトン表示を制御します
 */
export const EntryForm = () => {
    const navigate = useNavigate();
    const notify = useNotification();
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
            const promptText = buildConstructionPrompt({
                date,
                constructions,
                environments,
                selectedTypeIds,
                selectedProcessIds,
                selectedEnvIds
            });

            const res = await api.post(ENDPOINTS.JOBS.LIST, {
                message: promptText,
                tenant_id: user?.tenantId || user?.tenant_id
            });

            const { job_id: jobId } = res.data;
            if (!jobId) throw new Error("Job ID not returned");

            onClose();
            navigate('/result', { state: { jobId } });

        } catch (e) {
            console.error("Submission error:", e);
            // ★ alert から notify.error へ変更
            notify.error("サーバーへの送信に失敗しました。", "送信エラー");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ──────────────────────────────────────────
    // バリデーション付きの確認画面オープン
    // ──────────────────────────────────────────
    const handlePreSubmitCheck = () => {
        // 各項目ごとにチェックして、足りないものを個別に通知する
        if (selectedTypeIds.length === 0) {
            notify.warning("工事種別を1つ以上選択してください。", "入力チェック");
            return;
        }

        if (selectedProcessIds.length === 0) {
            notify.warning("工事工程を1つ以上選択してください。", "入力チェック");
            return;
        }

        if (selectedEnvIds.length === 0) {
            notify.warning("現場状況・環境を1つ以上選択してください。", "入力チェック");
            return;
        }

        // すべてOKなら確認モーダルを開く
        onOpen();
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
                onClick={handlePreSubmitCheck}
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
    );
};