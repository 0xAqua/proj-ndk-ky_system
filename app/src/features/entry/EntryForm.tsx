import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {Box, VStack, Text, useDisclosure, Skeleton} from "@chakra-ui/react";

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

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";
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

    const isLoading = isAuthLoading || isMasterLoading;

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
            // 工事種別名
            const typeNames = constructions
                .filter(cat => selectedTypeIds.includes(cat.id))
                .map(cat => cat.name);

            // ★ selectedProcesses を先に定義
            const selectedProcesses = constructions
                .flatMap(cat => cat.processes)
                .filter(proc => selectedProcessIds.includes(proc.id));

            // 本日の工事（工程名）
            const processNames = selectedProcesses.map(proc => proc.label);

            // 使用機材（重複除去）
            const equipments = [...new Set(
                selectedProcesses.flatMap(proc =>
                    proc.safety_equipments.map(eq => eq.title)
                )
            )];

            // 現場環境項目
            const environmentItems: string[] = [];
            environments.forEach(large => {
                large.children?.forEach(mid => {
                    mid.processes.forEach(item => {
                        if (selectedEnvIds.includes(item.id)) {
                            environmentItems.push(item.label);
                        }
                    });
                });
            });

            // 構造化データのみ送信
            const res = await api.post(ENDPOINTS.JOBS.LIST, {
                tenant_id: user?.tenantId || user?.tenant_id,
                input: {
                    typeNames,
                    processNames,
                    equipments,
                    environmentItems
                }
            });


            const { job_id: jobId } = res.data;
            if (!jobId) throw new Error("Job ID not returned");

            onClose();
            navigate('/result', { state: { jobId } });

        } catch (e) {
            console.error("Submission error:", e);
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
    // UIガード (早期リターン）
    // ──────────────────────────────────────────

    // エラー発生時
    if (error) {
        const errorMessage = error.message;
        return (
            <Box p={10} textAlign="center">
                <Text color="red.500" fontWeight="bold">
                    エラーが発生しました: {errorMessage}
                </Text>
            </Box>
        );
    }

    // ──────────────────────────────────────────
    // メインコンテンツ
    // ──────────────────────────────────────────
    return (
        <VStack gap={8} align="stretch">
            <ConstructionDate value={date} onChange={setDate} />

            {isLoading ? (
                <Skeleton h="120px" w="full" borderRadius="md" />
            ) : (
                <ConstructionProject
                    masterCategories={constructions}
                    selectedTypeIds={selectedTypeIds}
                    onChange={(newTypeIds) => {
                        setSelectedTypeIds(newTypeIds);
                        setSelectedProcessIds([]);
                    }}
                />
            )}

            {/* 3. 工事工程 */}
            {isLoading ? (
                <Skeleton h="200px" w="full" borderRadius="md" />
            ) : (
                <ConstructionProcess
                    masterCategories={constructions}
                    targetTypeIds={selectedTypeIds}
                    value={selectedProcessIds}
                    onChange={setSelectedProcessIds}
                />
            )}

            {isLoading ? (
                <Skeleton h="200px" w="full" borderRadius="md" />
            ) : (
                <ImportantEquipment
                    masterCategories={constructions}
                    selectedProcessIds={selectedProcessIds}
                />
            )}

            {isLoading ? (
                <Skeleton h="200px" w="full" borderRadius="md" />
            ) : (
                <SiteCondition
                    masterEnvironments={environments}
                    value={selectedEnvIds}
                    onChange={setSelectedEnvIds}
                />
            )}

            {isLoading ? (
                <Skeleton h="200px" w="full" borderRadius="md" />
            ) : (
                <SubmitButton
                    onClick={handlePreSubmitCheck}
                    loading={isSubmitting}
                >
                    入力内容の確認
                </SubmitButton>
            )}

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