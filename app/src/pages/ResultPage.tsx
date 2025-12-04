import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Spinner, Text, VStack, Heading, Card, Badge, Button } from "@chakra-ui/react";
import { api } from "@/lib/api";

export const ResultPage = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);

    // データのポーリング取得
    useEffect(() => {
        if (!jobId) return;

        const fetchJob = async () => {
            try {
                // API GatewayのGETエンドポイント (要実装)
                const res = await api.get(`/jobs/${jobId}`);
                const data = res.data;

                console.log("Job Status:", data.status);
                setJob(data);

                // 完了または失敗したらポーリング停止
                if (data.status === "COMPLETED" || data.status === "FAILED") {
                    setIsPolling(false);
                }
            } catch (e) {
                console.error("Polling error:", e);
                // エラーでも即停止せず、数回は粘るロジックが良いが今回は簡易的に表示のみ
                setError("データの取得に失敗しました");
            }
        };

        // 初回実行
        fetchJob();

        // 3秒ごとに実行
        const intervalId = setInterval(() => {
            if (isPolling) {
                fetchJob();
            }
        }, 3000);

        // クリーンアップ
        return () => clearInterval(intervalId);
    }, [jobId, isPolling]);

    // ─────────────────────────────
    // 表示部分
    // ─────────────────────────────

    if (error) {
        return <Box p={10} color="red.500">{error}</Box>;
    }

    if (!job) {
        return <Box p={10}>ロード中...</Box>;
    }

    // まだ処理中の場合 (PENDING または SENT)
    if (job.status !== "COMPLETED" && job.status !== "FAILED") {
        return (
            <Box h="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="blue.500" mb={4} />
                <Heading size="md">AIが解析中です...</Heading>
                <Text mt={2} color="gray.500">ステータス: {job.status}</Text>
                <Text fontSize="sm" color="gray.400">Job ID: {jobId}</Text>
            </Box>
        );
    }

    // 失敗した場合
    if (job.status === "FAILED") {
        return (
            <Box p={10}>
                <Heading size="md" color="red.500">解析に失敗しました</Heading>
                <Text mt={2}>詳細: {JSON.stringify(job.result || "不明なエラー")}</Text>
                <Button mt={4} onClick={() => navigate("/")}>トップへ戻る</Button>
            </Box>
        );
    }

    // 成功した場合 (COMPLETED)
    // job.result に AIからのJSON配列が入っている想定
    const incidents = job.result || [];

    return (
        <Box maxW="800px" mx="auto" p={6}>
            <VStack gap={6} align="stretch">
                <Heading size="lg" textAlign="center">危険予知 (KY) 解析結果</Heading>
                <Button alignSelf="start" variant="outline" size="sm" onClick={() => navigate("/")}>← 条件入力に戻る</Button>

                {/* 生データ確認用 (開発用) */}
                {/* <Code p={2} borderRadius="md" overflow="scroll" maxH="200px">
                    {JSON.stringify(job, null, 2)}
                </Code> */}

                {/* インシデント一覧表示 */}
                {Array.isArray(incidents) ? incidents.map((item: any, index: number) => (
                    <Card.Root key={index} variant="elevated">
                        <Card.Header>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Heading size="md">#{item.caseNo} {item.caseTitle}</Heading>
                                <Badge colorScheme={item.type === "Fact" ? "blue" : "purple"}>
                                    {item.type}
                                </Badge>
                            </Box>
                        </Card.Header>
                        <Card.Body>
                            <VStack align="start" gap={4}>
                                <Box>
                                    <Text fontWeight="bold" fontSize="sm" color="gray.600">概要</Text>
                                    <Text>{item.overview}</Text>
                                </Box>

                                <Box w="full">
                                    <Text fontWeight="bold" fontSize="sm" color="gray.600" mb={2}>具体的な対策</Text>
                                    <VStack align="stretch" gap={3}>
                                        {item.countermeasures?.map((measure: any) => (
                                            <Box key={measure.id} p={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderColor="green.400">
                                                <Text fontWeight="bold" fontSize="sm">{measure.title}</Text>
                                                <Text fontSize="sm" mt={1}>{measure.description}</Text>
                                                <Text fontSize="xs" mt={2} color="gray.500">
                                                    担当: {measure.assignees?.join(", ")}
                                                </Text>
                                            </Box>
                                        ))}
                                    </VStack>
                                </Box>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )) : (
                    <Text>結果データの形式が不正です。</Text>
                )}
            </VStack>
        </Box>
    );
};