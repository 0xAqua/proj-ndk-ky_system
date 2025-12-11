import { useMemo, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import {
    Box,
    Spinner,
    Stack, StackSeparator,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useJobResult } from "@/features/result/hooks/useJobResult";
import { normalizeIncidents } from "@/features/result/utils/normalizeIncidents";

import { IncidentCardHeader } from "@/features/result/components/elements/IncidentCardHeader";
import { IncidentCardContent } from "@/features/result/components/elements/IncidentCardContent";

import type { IncidentData, RawIncident } from "@/features/result/types";

export const ResultForm = () => {

    const location = useLocation();
    // stateがnullの場合も考慮して安全に取得
    const state = location.state as { jobId?: string } | null;
    const jobId = state?.jobId;

    // jobIdがない場合は空文字を渡してクラッシュを防ぐ（実際には直後にリダイレクトされるためAPIは走りきりません）
    const { status, result, error, isLoading } = useJobResult({
        jobId: jobId ?? "",
        intervalMs: 3000,
    });

    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    const rawIncidents: RawIncident[] = useMemo(() => {
        if (result && typeof result === 'object' && 'incidents' in result) {
            return result.incidents as RawIncident[];
        }
        return [];
    }, [result]);

    const incidents: IncidentData[] = useMemo(
        () => normalizeIncidents(rawIncidents),
        [rawIncidents],
    );

    // ──────────────────────────────────────────
    // ★ここでリダイレクト判定
    // ──────────────────────────────────────────
    if (!jobId) {
        // jobIdがないなら強制的にトップへ戻す（履歴も置き換え）
        return <Navigate to="/" replace />;
    }

    const handleCaseClick = (caseId: string) => {
        setSelectedCases((prev) =>
            prev.includes(caseId)
                ? prev.filter((id) => id !== caseId)
                : [...prev, caseId],
        );
    };

    // ──────────────────────────────────────────
    // 描画分岐
    // ──────────────────────────────────────────

    // ローディング
    if (isLoading && !result && !error) {
        return (
            <Box
                display="flex"
                flexDir="column"
                justifyContent="center"
                alignItems="center"
                h="100vh"
            >
                <Spinner size="xl" color="blue.500" />
                <Text mt={4}>
                    {status === "LOADING" ? "読み込み中..." : "AIが解析中..."}
                </Text>
            </Box>
        );
    }

    // エラー
    if (error) {
        return (
            <VStack m="auto" maxW="sm" gap={6} px={2} py={8}>
                <Box p={6} bg="white" borderRadius="md" w="full">
                    <Text color="red.500" fontWeight="bold" mb={2}>
                        エラーが発生しました
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                        {error}
                    </Text>
                </Box>
            </VStack>
        );
    }

    // 通常ケース
    return (
        <Box w="full">
            <Box
                bg="white"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="gray.200"
                overflow="hidden"
                shadow="sm"
            >
                <Stack gap={0} separator={<StackSeparator borderColor="gray.100" />}>
                    {incidents.map((incident) => {
                        const isOpen = selectedCases.includes(incident.id);
                        const onToggle = () => handleCaseClick(incident.id);

                        return (
                            <Box
                                key={incident.id}
                                bg={isOpen ? "gray.50" : "white"}
                                transition="background 0.2s"
                            >
                                <IncidentCardHeader
                                    incident={incident}
                                    isOpen={isOpen}
                                    onToggle={onToggle}
                                />

                                <IncidentCardContent
                                    incident={incident}
                                    isOpen={isOpen}
                                />
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        </Box>
    );
};