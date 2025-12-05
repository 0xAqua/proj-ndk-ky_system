// src/features/result/ResultForm.tsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Box,
    Spinner,
    Stack,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useJobResult } from "@/features/result/hooks/useJobResult";
import {
    normalizeIncidents,
    type IncidentData,
    type RawIncident,
} from "@/features/result/utils/normalizeIncidents";
import { IncidentCard } from "@/features/result/components/elements/IncidentCard";


export const ResultForm = () => {
    // ① Hooks は全部ここで呼ぶ（条件分岐の前）
    const { jobId } = useParams<{ jobId: string }>();

    const { status, result, error, isLoading } = useJobResult({
        jobId,
        intervalMs: 3000,
    });

    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    // result が null / undefined / オブジェクトでも落ちないようにケア
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

    // ② ここから下は「描画の分岐」だけ（Hook は呼ばない）

    // jobId 自体が無いとき
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

    // ローディング中（まだ result も error も無い）
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

    // 通常ケース：デザイン適用して表示
    return (
        <>
            {/* インシデントリスト */}
            <Box w="full">
                <Stack gap={4}>
                    {incidents.map((incident) => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            isOpen={selectedCases.includes(incident.id)}
                            onToggle={() => handleCaseClick(incident.id)}
                        />
                    ))}
                </Stack>
            </Box>
        </>
    );
};
