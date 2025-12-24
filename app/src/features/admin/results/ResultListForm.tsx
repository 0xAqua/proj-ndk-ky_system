import { Box, Spinner, Text, VStack, Button, HStack } from "@chakra-ui/react";
import { useVQJobs } from "./hooks/useVQJobs";
// import { JobMasterDetail } from "./components/JobMasterDetail";

export const ResultListForm = () => {
    const { jobs, loading, hasMore, error, loadMore, refresh } = useVQJobs();

    if (loading && jobs.length === 0) {
        return (
            <Box display="grid" placeItems="center" minH="70vh" px={4}>
                <VStack gap={4}>
                    <Spinner size="xl" color="blue.500" />
                    <Text color="gray.600">読み込み中...</Text>
                </VStack>
            </Box>
        );
    }

    if (error) {
        return (
            <Box maxW="container.md" mx="auto" px={4} py={10}>
                <Box p={6} bg="white" borderRadius="2xl" border="1px solid" borderColor="red.200">
                    <Text color="red.600" fontWeight="bold" mb={2}>
                        エラーが発生しました
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                        {error}
                    </Text>
                    <HStack mt={4} justify="flex-end">
                        <Button onClick={refresh} size="sm" variant="outline">
                            再読み込み
                        </Button>
                    </HStack>
                </Box>
            </Box>
        );
    }

    if (jobs.length === 0 && !loading) {
        return (
            <Box maxW="container.md" mx="auto" px={4} py={12}>
                <Box p={8} bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" textAlign="center">
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        VQ履歴がありません
                    </Text>
                    <Button mt={6} onClick={refresh} variant="outline" size="sm">
                        更新
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box maxW="container.xl" mx="auto" px={{ base: 3, md: 6 }} py={{ base: 6, md: 10 }}>
            {/* header */}
            <HStack justify="space-between" mb={4} align="flex-end">
                <Box>
                    <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold">
                        VQ履歴
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                        新しい順（{jobs.length}件）
                    </Text>
                </Box>
                <Button
                    onClick={refresh}
                    loading={loading}
                    size="sm"
                    variant="outline"
                >
                    更新
                </Button>
            </HStack>

            {/* ✅ master-detail */}
            {/*<JobMasterDetail jobs={jobs} isLoading={loading} />*/}

            {/* load more */}
            <Box textAlign="center" mt={6}>
                {hasMore ? (
                    <Button onClick={loadMore} loading={loading} colorScheme="blue" size="md" px={8}>
                        {loading ? "読み込み中..." : "もっと読み込む"}
                    </Button>
                ) : (
                    <Text textAlign="center" color="gray.500" fontSize="sm">
                        すべてのデータを表示しました（{jobs.length}件）
                    </Text>
                )}
            </Box>
        </Box>
    );
};
