import { useState } from "react";
import { Flex, Text, VStack, Badge, Button, Box, Separator, Dialog } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdWarning, MdClose, MdInfoOutline } from "react-icons/md";
import { FiTool } from "react-icons/fi";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

type Props = {
    masterCategories: ProcessCategory[];
    selectedProcessIds: string[];
};

export const ImportantEquipment = ({ masterCategories, selectedProcessIds }: Props) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ──────────────────────────────────────────
    // 1. 簡易表示用 (重複なし・ハイリスク順)
    // ──────────────────────────────────────────

    // 全ての選択済み工程から機材を抽出
    const allSelectedProcesses = masterCategories
        .flatMap(cat => cat.processes)
        .filter(proc => selectedProcessIds.includes(proc.id));

    // フラットな機材リストを作成
    const relevantEquipments = allSelectedProcesses.flatMap(proc => proc.safety_equipments);

    // IDで重複を排除（カード表示用）
    const uniqueEquipments = Array.from(
        new Map(relevantEquipments.map(eq => [eq.id, eq])).values()
    );

    // 並び替え: ハイリスク(true)を先に
    const sortedEquipments = uniqueEquipments.sort((a, b) => {
        return (a.is_high_risk === b.is_high_risk) ? 0 : a.is_high_risk ? -1 : 1;
    });

    const visibleEquipments = sortedEquipments.slice(0, 4);
    const hasItems = sortedEquipments.length > 0;

    // ──────────────────────────────────────────
    // 2. モーダル表示用 (工程ごとにフィルタリング)
    // ──────────────────────────────────────────

    // 機材が含まれる工程のみを抽出（機材がない工程はモーダルに出さない）
    const processesWithEquipment = allSelectedProcesses.filter(
        proc => proc.safety_equipments.length > 0
    );

    return (
        <Box bg="white" w="full" p={2} borderRadius="2xl" boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)" >
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    {/* ── ヘッダーエリア ── */}
                    <Flex align="center" gap={2} justify="space-between" w="full">
                        <Flex align="center" gap={2}>
                            <MdWarning size={16} color={hasItems ? "orange" : "gray"} />
                            <Text fontWeight="bold" fontSize="sm" color={hasItems ? "black" : "gray.500"}>
                                注意が必要な機材
                            </Text>
                        </Flex>

                        {/* 詳細ボタン */}
                        {sortedEquipments.length > 4 && (
                            <Text
                                fontSize="xs"
                                color="blue.500"
                                cursor="pointer"
                                _hover={{ textDecoration: "underline" }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                すべて見る ({sortedEquipments.length})
                            </Text>
                        )}
                    </Flex>

                    {/* ── カードコンテンツ (簡易表示) ── */}
                    {hasItems ? (
                        <>
                            <Text fontSize="xs" color="gray.500">
                                選択した工事工程に基づき、以下の機材の使用時は特に注意してください。
                            </Text>
                            <Flex gap={2} wrap="wrap">
                                {visibleEquipments.map((equipment) => (
                                    <Badge
                                        key={equipment.id}
                                        size="sm"
                                        colorPalette={equipment.is_high_risk ? "red" : "orange"}
                                        variant="subtle"
                                    >
                                        {equipment.title}
                                    </Badge>
                                ))}
                                {sortedEquipments.length > 4 && (
                                    <Text fontSize="xs" color="gray.500" alignSelf="center">
                                        他 {sortedEquipments.length - 4} 件...
                                    </Text>
                                )}
                            </Flex>
                        </>
                    ) : (
                        // データがない場合の案内
                        <Flex
                            w="full"
                            bg="gray.50"
                            p={3}
                            borderRadius="md"
                            align="center"
                            justify="center"
                            gap={2}
                            border="1px dashed"
                            borderColor="gray.200"
                        >
                            <MdInfoOutline color="gray" />
                            <Text fontSize="xs" color="gray.500">
                                上記で工事工程を選択すると、必要な機材が表示されます。
                            </Text>
                        </Flex>
                    )}

                </VStack>
            </ContentBox>

            {/* ── モーダル: 工程ごとのリスト表示 ── */}
            <Dialog.Root open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e.open)} size="lg">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content m={4}>
                        <Dialog.Header>
                            <Dialog.Title>使用機材一覧</Dialog.Title>
                            <Dialog.CloseTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MdClose />
                                </Button>
                            </Dialog.CloseTrigger>
                        </Dialog.Header>

                        <Dialog.Body>
                            <VStack align="start" gap={6} w="full" pb={4}>
                                {processesWithEquipment.map((process) => (
                                    <Box key={process.id} w="full">
                                        {/* 工程名ヘッダー */}
                                        <Flex align="center" gap={2} mb={2}>
                                            <FiTool size={16} color="#007AFF" />
                                            <Text fontWeight="bold" fontSize="md">
                                                {process.label}
                                            </Text>
                                        </Flex>

                                        <Separator mb={3} />

                                        {/* その工程で使う機材リスト */}
                                        <VStack align="start" gap={2} pl={2}>
                                            {process.safety_equipments.map((equipment) => (
                                                <Flex key={`${process.id}-${equipment.id}`} align="center" gap={3}>
                                                    <Box w="20px" display="flex" justifyContent="center">
                                                        {equipment.is_high_risk ? (
                                                            <MdWarning size={18} color="orange" />
                                                        ) : (
                                                            <Box w="6px" h="6px" borderRadius="full" bg="gray.300" />
                                                        )}
                                                    </Box>

                                                    <Text fontSize="sm" fontWeight={equipment.is_high_risk ? "bold" : "normal"}>
                                                        {equipment.title}
                                                    </Text>
                                                </Flex>
                                            ))}
                                        </VStack>
                                    </Box>
                                ))}
                            </VStack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </Box>
    );
};