// src/features/admin/results/components/JobDetailPane.tsx
import { useMemo, useState } from "react";
import {
    Box,
    Button,
    HStack,
    Heading,
    Text,
    VStack,
    Badge,
    Flex,
} from "@chakra-ui/react";
import { type Incident, useVQJobReply } from "@/features/admin/results/hooks/useFetchVQJobReply.ts";

type Props = {
    jobId: string | null;
};

const isFactIncident = (classification: string) => {
    const s = classification ?? "";
    return s.includes("過去");
};

export const JobDetailPane = ({ jobId }: Props) => {
    const { reply, loading, error, refetch } = useVQJobReply(jobId);

    const { fact, ai } = useMemo(() => {
        const incidents = reply?.incidents ?? [];
        const fact = incidents.filter((i) => isFactIncident(i.classification));
        const ai = incidents.filter((i) => !isFactIncident(i.classification));
        return { fact, ai };
    }, [reply]);

    const all = reply?.incidents ?? [];

    const [selectedId, setSelectedId] = useState<number | null>(null);

    const selected: Incident | null = useMemo(() => {
        if (!all.length) return null;
        const id = selectedId ?? all[0]?.id ?? null;
        return all.find((i) => i.id === id) ?? null;
    }, [all, selectedId]);

    // jobId が変わったら選択リセット
    useMemo(() => {
        setSelectedId(null);
    }, [jobId]);

    // 空状態・ローディング・エラー
    if (!jobId) {
        return (
            <Flex h="full" align="center" justify="center" p={6}>
                <Text fontSize="sm" color="gray.500">
                    左の一覧からジョブを選択してください
                </Text>
            </Flex>
        );
    }

    if (loading) {
        return (
            <Flex h="full" align="center" justify="center" p={6}>
                <Text fontSize="sm" color="gray.500">
                    読み込み中...
                </Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex h="full" align="center" justify="center" direction="column" gap={3} p={6}>
                <Text fontSize="sm" color="red.500">
                    {error}
                </Text>
                <Button size="sm" onClick={refetch}>
                    再取得
                </Button>
            </Flex>
        );
    }

    if (!reply || all.length === 0) {
        return (
            <Flex h="full" align="center" justify="center" p={6}>
                <Text fontSize="sm" color="gray.500">
                    インシデントがありません
                </Text>
            </Flex>
        );
    }

    return (
        <Flex direction="column" h="full">
            {/* Header（固定） */}
            <Box p={4} borderBottom="1px solid" borderColor="gray.100" flexShrink={0}>
                <Heading size="sm" mb={2}>
                    インシデント
                </Heading>
                <HStack gap={2} wrap="wrap">
                    <Badge colorPalette="orange" variant="subtle">
                        過去 {fact.length}
                    </Badge>
                    <Badge colorPalette="pink" variant="subtle">
                        AI {ai.length}
                    </Badge>
                    <Badge colorPalette="gray" variant="subtle">
                        合計 {all.length}
                    </Badge>
                </HStack>
            </Box>

            {/* 2カラム：左=一覧 / 右=詳細 */}
            <Flex flex="1" minH={0} overflow="hidden">
                {/* Left: インシデント一覧（スクロール可） */}
                <Box
                    w="280px"
                    flexShrink={0}
                    borderRight="1px solid"
                    borderColor="gray.100"
                    overflowY="auto"
                >
                    <Box p={3}>
                        <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">
                            一覧
                        </Text>

                        <VStack align="stretch" gap={2}>
                            {all.map((i) => {
                                const active = selected?.id === i.id;
                                const factLike = isFactIncident(i.classification);
                                return (
                                    <Box
                                        key={i.id}
                                        p={3}
                                        borderWidth="1px"
                                        borderColor={active ? "blue.300" : "gray.200"}
                                        bg={active ? "blue.50" : "white"}
                                        borderRadius="md"
                                        cursor="pointer"
                                        onClick={() => setSelectedId(i.id)}
                                        _hover={{ bg: active ? "blue.50" : "gray.50" }}
                                        transition="all 0.12s"
                                    >
                                        <HStack justify="space-between" gap={2} mb={1}>
                                            <Badge
                                                size="sm"
                                                variant="subtle"
                                                colorPalette={factLike ? "orange" : "pink"}
                                            >
                                                {factLike ? "過去" : "AI"}
                                            </Badge>
                                            <Text fontSize="xs" color="gray.400">
                                                #{i.id}
                                            </Text>
                                        </HStack>
                                        <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                                            {i.title}
                                        </Text>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                </Box>

                {/* Right: 詳細（スクロール可） */}
                <Box flex="1" overflowY="auto" minW={0}>
                    <Box p={4}>
                        {!selected ? (
                            <Text fontSize="sm" color="gray.500">
                                インシデントを選択してください
                            </Text>
                        ) : (
                            <VStack align="stretch" gap={5}>
                                {/* タイトル */}
                                <Box>
                                    <HStack gap={2} mb={2} wrap="wrap">
                                        <Badge
                                            variant="subtle"
                                            colorPalette={isFactIncident(selected.classification) ? "orange" : "pink"}
                                        >
                                            {selected.classification}
                                        </Badge>
                                        <Text fontSize="xs" color="gray.400">
                                            #{selected.id}
                                        </Text>
                                    </HStack>
                                    <Heading size="md">{selected.title}</Heading>
                                </Box>

                                {/* 概要 */}
                                <Box>
                                    <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
                                        概要
                                    </Text>
                                    <Text fontSize="sm" color="gray.700" lineHeight="tall">
                                        {selected.summary}
                                    </Text>
                                </Box>

                                {/* 原因 */}
                                <Box>
                                    <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
                                        原因
                                    </Text>
                                    <Text fontSize="sm" color="gray.700" lineHeight="tall">
                                        {selected.cause}
                                    </Text>
                                </Box>

                                {/* 対策 */}
                                <Box>
                                    <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={2}>
                                        対策（{selected.countermeasures?.length ?? 0}件）
                                    </Text>

                                    <VStack align="stretch" gap={3}>
                                        {(selected.countermeasures ?? []).map((c) => (
                                            <Box
                                                key={c.no}
                                                p={4}
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="md"
                                                bg="gray.50"
                                            >
                                                <HStack justify="space-between" gap={2} mb={2}>
                                                    <Text fontSize="sm" fontWeight="semibold">
                                                        {c.no}. {c.title}
                                                    </Text>
                                                    <Badge variant="subtle" colorPalette="blue" flexShrink={0}>
                                                        {c.responsible}
                                                    </Badge>
                                                </HStack>
                                                <Text fontSize="sm" color="gray.600" lineHeight="tall">
                                                    {c.description}
                                                </Text>
                                            </Box>
                                        ))}

                                        {(selected.countermeasures ?? []).length === 0 && (
                                            <Text fontSize="sm" color="gray.500">
                                                対策がありません
                                            </Text>
                                        )}
                                    </VStack>
                                </Box>
                            </VStack>
                        )}
                    </Box>
                </Box>
            </Flex>
        </Flex>
    );
};