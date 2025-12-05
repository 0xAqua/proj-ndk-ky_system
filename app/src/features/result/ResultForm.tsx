// src/features/result/ResultForm.tsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Box,
    Spinner,
    Stack, StackSeparator,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useJobResult } from "@/features/result/hooks/useJobResult";
import { normalizeIncidents } from "@/features/result/utils/normalizeIncidents";

// 分割したコンポーネントをインポート
import { IncidentCardHeader } from "@/features/result/components/elements/IncidentCardHeader";
import { IncidentCardContent } from "@/features/result/components/elements/IncidentCardContent";

import type { IncidentData, RawIncident } from "@/features/result/types";

export const ResultForm = () => {
    // ① Hooks
    const { jobId } = useParams<{ jobId: string }>();

    const { status, result, error, isLoading } = useJobResult({
        jobId,
        intervalMs: 3000,
    });

    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    const rawIncidents: RawIncident[] = useMemo(
        () => (Array.isArray(result) ? (result as RawIncident[]) : []),
        [result],
    );

    const incidents: IncidentData[] = useMemo(
        () => normalizeIncidents(rawIncidents),
        [rawIncidents],
    );

    const handleCaseClick = (caseId: string) => {
        setSelectedCases((prev) =>
            prev.includes(caseId)
                ? prev.filter((id) => id !== caseId)
                : [...prev, caseId],
        );
    };

    // ② 描画分岐

    // jobId なし
    if (!jobId) {
        return (
            <VStack m="auto" maxW="sm" gap={6} px={2} py={8}>
                <Box p={6} bg="white" borderRadius="md" w="full">
                    <Text color="red.500" fontWeight="bold" mb={2}>
                        ジョブIDが指定されていません
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                        URL を再確認してください。
                    </Text>
                </Box>
            </VStack>
        );
    }

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
            {/* 全体を囲む大きな枠（外枠） */}
            <Box
                bg="white"
                borderRadius="xl" // 少し丸みを強くしてモダンに
                borderWidth="1px"
                borderColor="gray.200"
                overflow="hidden" // 角丸からはみ出さないように
                shadow="sm" // 軽く影をつける
            >
                {/* 隙間(gap)を0にして、間に線を入れる */}
                <Stack gap={0} separator={<StackSeparator borderColor="gray.100" />}>
                    {incidents.map((incident) => {
                        const isOpen = selectedCases.includes(incident.id);
                        const onToggle = () => handleCaseClick(incident.id);

                        return (
                            <Box
                                key={incident.id}
                                bg={isOpen ? "gray.50" : "white"} // 開いている時は少し背景色を変える
                                transition="background 0.2s"
                            >
                                {/* 中身のコンポーネントには「枠線」を持たせない
                                    （親のStackSeparatorが区切り線になるため）
                                */}
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