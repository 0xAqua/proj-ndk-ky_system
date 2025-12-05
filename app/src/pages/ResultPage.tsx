// src/pages/ResultPage.tsx
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { ResultForm } from "@/features/result/ResultForm";
import { useJobResult } from "@/features/result/hooks/useJobResult";

export const ResultPage = () => {
    const { jobId } = useParams<{ jobId: string }>();

    const { status, result, error, isLoading } = useJobResult({
        jobId,
        intervalMs: 3000,
    });

    // ローディング中
    if (isLoading) {
        return (
            <Box display="flex" flexDir="column" justifyContent="center" alignItems="center" h="100vh">
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

    // 結果表示
    return (
        <VStack m="auto" maxW="sm" gap={6} px={2} py={8}>
            <ResultForm jobId={jobId!} status={status} result={result} />
        </VStack>
    );
};
