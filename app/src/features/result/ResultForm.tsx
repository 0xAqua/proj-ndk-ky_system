import { useMemo, useState } from "react";
import {useLocation, Navigate, useNavigate} from "react-router-dom";
import {Box, Button, Stack, StackSeparator} from "@chakra-ui/react";

// Hooks & Utils
import { useJobResult } from "@/features/result/hooks/useJobResult";
import { normalizeIncidents } from "@/features/result/utils/normalizeIncidents";

// Components
import { IncidentCardHeader } from "@/features/result/components/elements/IncidentCardHeader";
import { IncidentCardContent } from "@/features/result/components/elements/IncidentCardContent";
import { ResultFormSkeleton } from "@/features/result/components/elements/ResultFormSkeleton";
import { ProcessingModal } from "@/features/result/components/elements/ProcessingModal";

import type { RawIncident } from "@/features/result/types";
import {MdArrowBack} from "react-icons/md";

export const ResultForm = () => {
    const location = useLocation();
    const state = location.state as { jobId?: string } | null;
    const jobId = state?.jobId;
    const navigate = useNavigate();

    const { status, result, error, isLoading } = useJobResult({
        jobId: jobId ?? "",
        intervalMs: 3000,
    });

    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    const incidents = useMemo(() => {
        if (result && typeof result === 'object' && 'incidents' in result) {
            return normalizeIncidents(result.incidents as RawIncident[]);
        }
        return [];
    }, [result]);

    // ──────────────────────────────────────────
    // ロジック判定
    // ──────────────────────────────────────────

    if (!jobId) return <Navigate to="/entry" replace />;

    // 待機判定：ロード中、または完了・失敗以外のステータス（PROCESSING等）
    const isWaiting = isLoading || (status !== "COMPLETED" && status !== "FAILED");

    const handleBack = () => {
        navigate("/entry"); // 入力フォームのパスへ戻る
    };

    return (
        <Box w="full" maxW="4xl" mx="auto" position="relative">
            {/* 1. 解析中ダイアログ（最前面：背景をぼかしてスケルトンを見せる） */}
            <ProcessingModal isOpen={isWaiting && !error} status={status} />

            {/* 2. メインコンテンツエリア */}
            {error ? (
                <Box p={8} bg="white" borderRadius="xl" border="1px solid" borderColor="red.100" textAlign="center">
                    <Box color="red.600" fontWeight="bold">解析エラー: {error}</Box>
                </Box>
            ) : (
                <Box
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    overflow="hidden"
                    borderRadius="2xl"
                    boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)"
                >
                    {/* 待機中はスケルトン、完了後は本番データを表示 */}
                    {isWaiting && incidents.length === 0 ? (
                        <ResultFormSkeleton />
                    ) : (
                        <Stack gap={0} separator={<StackSeparator borderColor="gray.100" />}>
                            {incidents.map((incident) => {
                                const isOpen = selectedCases.includes(incident.id);
                                const onToggle = () => {
                                    setSelectedCases(prev =>
                                        prev.includes(incident.id)
                                            ? prev.filter(id => id !== incident.id)
                                            : [...prev, incident.id]
                                    );
                                };

                                return (
                                    <Box key={incident.id} bg={isOpen ? "gray.50" : "white"} transition="0.2s">
                                        <IncidentCardHeader incident={incident} isOpen={isOpen} onToggle={onToggle} />
                                        <IncidentCardContent incident={incident} isOpen={isOpen} />
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </Box>

            )}
            {/* 3. 戻るボタン */}
            {!error && !isWaiting && (
                <Box mt={10} mb={6} textAlign="center">
                    <Button
                        onClick={handleBack}

                        // ▼ ベースのスタイル (通常時)
                        size="lg"
                        variant="outline"
                        bg="orange.500"
                        color="white"       // 文字をオレンジ500
                        borderWidth="2px"        // 枠線を少し太くして色を強調
                        rounded="full"
                        px={10}
                        h={14}
                        fontSize="md"
                        fontWeight="bold"
                        _active={{
                            transform: "translateY(0)",
                            boxShadow: "none"
                        }}
                        transition="all 0.3s ease" // アニメーションを少しゆったりに
                    >
                        <MdArrowBack size={20} />
                        条件入力へ戻る
                    </Button>
                </Box>
            )}
        </Box>
    );
};