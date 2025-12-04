import { VStack, Text, Flex, Box, Accordion, Checkbox, Separator } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdLocationOn, MdChevronRight } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

type Props = {
    // 環境マスタデータ
    masterEnvironments: ProcessCategory[];
    // 選択されたIDリスト
    value: string[];
    onChange: (value: string[]) => void;
};

export const SiteCondition = ({ masterEnvironments, value = [], onChange }: Props) => {

    // ──────────────────────────────────────────
    // チェック状態操作ロジック
    // ──────────────────────────────────────────

    // 1. 個別のアイテム切り替え
    const toggleItem = (id: string) => {
        const nextValue = value.includes(id)
            ? value.filter((v) => v !== id)
            : [...value, id];
        onChange(nextValue);
    };

    // 2. グループ一括切り替え（大項目・中項目用）
    const toggleGroup = (ids: string[]) => {
        // すべて選択されているかチェック
        const allSelected = ids.every(id => value.includes(id));

        if (allSelected) {
            // 全解除: 現在のvalueから、このグループのIDを除外
            onChange(value.filter(id => !ids.includes(id)));
        } else {
            // 全選択: 現在のvalueに、このグループの未選択IDを追加
            const newIds = ids.filter(id => !value.includes(id));
            onChange([...value, ...newIds]);
        }
    };

    // 3. グループのチェック状態判定 (checked / indeterminate)
    const getGroupStatus = (ids: string[]) => {
        if (ids.length === 0) return { checked: false, indeterminate: false };

        const selectedCount = ids.filter(id => value.includes(id)).length;
        const allSelected = selectedCount === ids.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return { checked: allSelected, indeterminate: someSelected };
    };

    if (masterEnvironments.length === 0) return null;

    return (
        <Box bg="white" w="full" p={2} borderRadius="lg">
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    {/* ヘッダー */}
                    <Flex align="center" gap={2}>
                        <MdLocationOn size={16} color="#34C759" />
                        <Text fontWeight="bold" fontSize="sm">現場状況・環境</Text>
                        <Text color="red.500" fontSize="sm">*</Text>
                    </Flex>

                    <Text fontSize="xs" color="gray.500">
                        該当する現場の状況を選択してください。（複数選択可）
                    </Text>

                    {/* 大項目 (ENV#x) のアコーディオン */}
                    <Accordion.Root multiple w="full">
                        {masterEnvironments.map((largeCat) => {
                            // 大項目に含まれる全小項目のIDリストを作成
                            const allLargeCatItemIds = largeCat.children?.flatMap(
                                mid => mid.processes.map(p => p.id)
                            ) || [];

                            const largeCatStatus = getGroupStatus(allLargeCatItemIds);

                            return (
                                <Accordion.Item key={largeCat.id} value={largeCat.id}>
                                    <Accordion.ItemTrigger>
                                        <Flex justify="space-between" align="center" w="full">
                                            <Flex align="center" gap={3}>
                                                {/* ★大項目のチェックボックス (修正済み) */}
                                                <Checkbox.Root
                                                    // indeterminateがtrueなら文字列 "indeterminate" を渡す
                                                    checked={largeCatStatus.indeterminate ? "indeterminate" : largeCatStatus.checked}
                                                    // indeterminate プロパティは削除しました
                                                    onCheckedChange={() => toggleGroup(allLargeCatItemIds)}
                                                    colorPalette="green"
                                                    onClick={(e) => e.stopPropagation()} // アコーディオン開閉を防ぐ
                                                >
                                                    <Checkbox.HiddenInput />
                                                    <Checkbox.Control />
                                                </Checkbox.Root>

                                                <Text fontWeight="medium" fontSize="sm">{largeCat.name}</Text>
                                            </Flex>
                                            <Accordion.ItemIndicator>
                                                <MdChevronRight />
                                            </Accordion.ItemIndicator>
                                        </Flex>
                                    </Accordion.ItemTrigger>

                                    <Accordion.ItemContent>
                                        <Box
                                            p={3}
                                            bg="gray.50"
                                            borderRadius="md"
                                            mt={1}
                                            border="1px solid"
                                            borderColor="gray.100"
                                        >
                                            <VStack align="start" gap={5}>
                                                {/* 中項目 (TYPE) ループ */}
                                                {largeCat.children?.map((midCat, index) => {
                                                    // 中項目に含まれる全小項目のIDリスト
                                                    const midCatItemIds = midCat.processes.map(p => p.id);
                                                    const midCatStatus = getGroupStatus(midCatItemIds);

                                                    return (
                                                        <Box key={midCat.id} w="full">
                                                            <Flex align="center" gap={2} mb={2}>
                                                                {/* ★中項目のチェックボックス (修正済み) */}
                                                                <Checkbox.Root
                                                                    // indeterminateがtrueなら文字列 "indeterminate" を渡す
                                                                    checked={midCatStatus.indeterminate ? "indeterminate" : midCatStatus.checked}
                                                                    // indeterminate プロパティは削除しました
                                                                    onCheckedChange={() => toggleGroup(midCatItemIds)}
                                                                    colorPalette="green"
                                                                    size="sm"
                                                                >
                                                                    <Checkbox.HiddenInput />
                                                                    <Checkbox.Control />
                                                                </Checkbox.Root>

                                                                <Text fontSize="sm" fontWeight="bold" color="gray.700">
                                                                    {midCat.name}
                                                                </Text>
                                                            </Flex>

                                                            {/* 小項目 (ITEM) チェックボックスリスト */}
                                                            <VStack align="start" gap={3} pl={6}>
                                                                {midCat.processes.map((item) => (
                                                                    <Checkbox.Root
                                                                        key={item.id}
                                                                        checked={value.includes(item.id)}
                                                                        onCheckedChange={() => toggleItem(item.id)}
                                                                        colorPalette="green"
                                                                        size="md"
                                                                    >
                                                                        <Checkbox.HiddenInput />
                                                                        <Checkbox.Control />
                                                                        <Checkbox.Label fontSize="sm" color="gray.800">
                                                                            {item.label}
                                                                        </Checkbox.Label>
                                                                    </Checkbox.Root>
                                                                ))}
                                                            </VStack>

                                                            {/* 区切り線（最後以外） */}
                                                            {index < (largeCat.children?.length ?? 0) - 1 && (
                                                                <Separator mt={4} borderColor="gray.200" />
                                                            )}
                                                        </Box>
                                                    );
                                                })}
                                            </VStack>
                                        </Box>
                                    </Accordion.ItemContent>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion.Root>
                </VStack>
            </ContentBox>
        </Box>
    );
};