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
} from "@chakra-ui/react";
import {type Incident, useVQJobReply} from "@/features/admin/results/hooks/useFetchVQJobReply.ts";


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

    // jobId が変わったら選択リセット（最低限）
    useMemo(() => {
        setSelectedId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    if (!jobId) {
        return (
            <Box p={6}>
                <Heading size="sm" mb={2}>
                    詳細
                </Heading>
                <Text fontSize="sm" color="gray.500">
                    左の一覧からジョブを選択してください
                </Text>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box p={6}>
                <Heading size="sm" mb={2}>
                    詳細
                </Heading>
                <Text fontSize="sm" color="gray.500">
                    読み込み中...
                </Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={6}>
                <Heading size="sm" mb={2}>
                    詳細
                </Heading>
                <Text fontSize="sm" color="red.500" mb={3}>
                    {error}
                </Text>
                <Button size="sm" onClick={refetch}>
                    再取得
                </Button>
            </Box>
        );
    }

    if (!reply) {
        return (
            <Box p={6}>
                <Heading size="sm" mb={2}>
                    詳細
                </Heading>
                <Text fontSize="sm" color="gray.500">
                    データがありません
                </Text>
            </Box>
        );
    }

    return (
        <Box p={6}>
            <VStack align="stretch" gap={4}>
                {/* Header */}
                <Box>
                    <Heading size="sm" mb={1}>
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

                {/* 2カラム：左=一覧 / 右=詳細（最小限） */}
                <HStack align="start" gap={4}>
                    {/* Left list */}
                    <Box w="42%" minW="240px">
                        <Text fontSize="xs" color="gray.500" mb={2}>
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
                                        borderColor={active ? "blue.200" : "gray.200"}
                                        bg={active ? "blue.50" : "white"}
                                        borderRadius="md"
                                        cursor="pointer"
                                        onClick={() => setSelectedId(i.id)}
                                        _hover={{ bg: active ? "blue.50" : "gray.50" }}
                                    >
                                        <HStack justify="space-between" gap={2} mb={1}>
                                            <Badge
                                                size="sm"
                                                variant="subtle"
                                                colorPalette={factLike ? "orange" : "pink"}
                                            >
                                                {factLike ? "過去" : "AI"}
                                            </Badge>
                                            <Text fontSize="xs" color="gray.500" flexShrink={0}>
                                                #{i.id}
                                            </Text>
                                        </HStack>

                                        <Text fontSize="sm" fontWeight="semibold" lineClamp={2}>
                                            {i.title}
                                        </Text>
                                    </Box>
                                );
                            })}

                            {all.length === 0 && (
                                <Text fontSize="sm" color="gray.500">
                                    インシデントがありません
                                </Text>
                            )}
                        </VStack>
                    </Box>

                    {/* Right detail */}
                    <Box flex="1" minW={0}>
                        <Text fontSize="xs" color="gray.500" mb={2}>
                            詳細
                        </Text>

                        {!selected ? (
                            <Text fontSize="sm" color="gray.500">
                                選択されたインシデントがありません
                            </Text>
                        ) : (
                            <VStack align="stretch" gap={3}>
                                <Box>
                                    <HStack gap={2} mb={1} wrap="wrap">
                                        <Badge
                                            variant="subtle"
                                            colorPalette={isFactIncident(selected.classification) ? "orange" : "pink"}
                                        >
                                            {selected.classification}
                                        </Badge>
                                        <Text fontSize="xs" color="gray.500">
                                            id: {selected.id}
                                        </Text>
                                    </HStack>
                                    <Heading size="sm">{selected.title}</Heading>
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                                        概要
                                    </Text>
                                    <Text fontSize="sm" color="gray.700">
                                        {selected.summary}
                                    </Text>
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                                        原因
                                    </Text>
                                    <Text fontSize="sm" color="gray.700">
                                        {selected.cause}
                                    </Text>
                                </Box>

                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                                        対策（{selected.countermeasures?.length ?? 0}）
                                    </Text>

                                    <VStack align="stretch" gap={2}>
                                        {(selected.countermeasures ?? []).map((c) => (
                                            <Box
                                                key={c.no}
                                                p={3}
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="md"
                                                bg="gray.50"
                                            >
                                                <HStack justify="space-between" gap={2} mb={1}>
                                                    <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                                                        {c.no}. {c.title}
                                                    </Text>
                                                    <Badge variant="subtle" colorPalette="gray">
                                                        {c.responsible}
                                                    </Badge>
                                                </HStack>
                                                <Text fontSize="sm" color="gray.700">
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
                </HStack>
            </VStack>
        </Box>
    );
};
