import { Box, Grid, Spinner, Text, VStack, Button, HStack } from "@chakra-ui/react";
import { useVQJobs } from "./hooks/useVQJobs";
import { JobCard } from "./components/JobCard.tsx";

export const ResultListForm = () => {
    const { jobs, loading, hasMore, error, loadMore, refresh } = useVQJobs();

    // ローディング中（初回）
    if (loading && jobs.length === 0) {
        return (
            <Box
                display="flex"
                flexDir="column"
                justifyContent="center"
                alignItems="center"
                h="100vh"
            >
                <Spinner size="xl" color="blue.500" />
                <Text mt={4}>読み込み中...</Text>
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

    // データなし
    if (jobs.length === 0 && !loading) {
        return (
            <Box maxW="container.xl" mx="auto" px={4} py={8}>
                <Text color="gray.500" textAlign="center">
                    VQ履歴がありません
                </Text>
            </Box>
        );
    }

    return (
        <Box maxW="container.xl" mx="auto" px={4} py={8}>
            {/* ヘッダー */}
            <HStack justify="space-between" mb={6}>
                <Text fontSize="2xl" fontWeight="bold">
                    VQ履歴
                </Text>
                <Button onClick={refresh} loading={loading} size="sm" variant="outline">
                    更新
                </Button>
            </HStack>

            {/* グリッドレイアウト */}
            <Grid
                templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                gap={4}
                mb={8}
            >
                {jobs.map((job) => (
                    <JobCard key={job.job_id} job={job} />
                ))}
            </Grid>

            {/* もっと読み込むボタン */}
            {hasMore && (
                <Box textAlign="center">
                    <Button
                        onClick={loadMore}
                        loading={loading}
                        colorScheme="blue"
                        size="md"
                    >
                        {loading ? "読み込み中..." : "もっと読み込む"}
                    </Button>
                </Box>
            )}

            {/* 全件表示済み */}
            {!hasMore && jobs.length > 0 && (
                <Text textAlign="center" color="gray.500" fontSize="sm">
                    すべてのデータを表示しました ({jobs.length}件)
                </Text>
            )}
        </Box>
    );
};