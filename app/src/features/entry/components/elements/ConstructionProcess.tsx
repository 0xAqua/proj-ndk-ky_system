import { Checkbox, Flex, Text, Box, VStack, Accordion } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdBuild, MdChevronRight, MdInfoOutline } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";
import {useEffect} from "react";

type Props = {
    // 親から受け取るマスタデータ (EntryFormから渡される constructions)
    masterCategories: ProcessCategory[];
    // 表示対象の種別IDリスト (ConstructionWorkUiで選ばれたもの)
    targetTypeIds: string[];
    // 選択された工程ID (実際に保存する値)
    value: string[];
    onChange: (value: string[]) => void;
};

export const ConstructionProcess = ({ masterCategories, targetTypeIds, value = [], onChange }: Props) => {

    useEffect(() => {
        // 現在有効な種別に含まれる工程IDを取得
        const validProcessIds = masterCategories
            .filter(cat => targetTypeIds.includes(cat.id))
            .flatMap(cat => cat.processes.map(p => p.id));

        // 無効な工程IDを除外
        const filteredValue = value.filter(id => validProcessIds.includes(id));

        // 変更があれば更新
        if (filteredValue.length !== value.length) {
            onChange(filteredValue);
        }
    }, [targetTypeIds, masterCategories, value, onChange]);

    // 選択された種別ID(targetTypeIds)に一致するものだけを抽出
    const visibleCategories = masterCategories.filter(cat =>
        targetTypeIds.includes(cat.id)
    );

    // 表示データの有無
    const hasCategories = visibleCategories.length > 0;

    // ──────────────────────────────────────────
    // チェックボックス制御ロジック
    // ──────────────────────────────────────────
    const toggleProcess = (id: string) => {
        const nextValue = value.includes(id)
            ? value.filter((pid) => pid !== id)
            : [...value, id];
        onChange(nextValue);
    };

    const isCategoryChecked = (items: { id: string }[]) => {
        if (!items || items.length === 0) return false;
        return items.every((p) => value.includes(p.id));
    };

    const toggleCategory = (items: { id: string }[]) => {
        const ids = items.map((p) => p.id);
        const allChecked = isCategoryChecked(items);

        let nextValue;
        if (allChecked) {
            nextValue = value.filter((id) => !ids.includes(id));
        } else {
            const newIds = ids.filter((id) => !value.includes(id));
            nextValue = [...value, ...newIds];
        }
        onChange(nextValue);
    };

    // チェックボックス制御ロジック に追加
    const isCategoryIndeterminate = (items: { id: string }[]) => {
        if (!items || items.length === 0) return false;
        const checkedCount = items.filter((p) => value.includes(p.id)).length;
        return checkedCount > 0 && checkedCount < items.length;
    };


    return (
        <Box bg="white" w="full" p={2} borderRadius="2xl" boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)" >
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    {/* ── ヘッダーエリア ── */}
                    <Flex align="center" gap={2}>
                        <MdBuild size={16} color={hasCategories ? "#007AFF" : "gray"} />
                        <Text fontWeight="bold" fontSize="sm" color={hasCategories ? "black" : "gray.500"}>
                            工事工程
                        </Text>
                        <Text color={hasCategories ? "red.500" : "gray.400"} fontSize="sm">*</Text>
                    </Flex>

                    {/* ── コンテンツエリア ── */}
                    {hasCategories ? (
                        <>
                            <Text fontSize="xs" color="gray.500">
                                実施する工事の工程を選択してください。
                            </Text>

                            <Accordion.Root multiple w="full">
                                {visibleCategories.map((category) => (
                                    <Accordion.Item key={category.id} value={category.id}>
                                        <Accordion.ItemTrigger>
                                            <Flex justify="space-between" align="center" w="full">
                                                <Flex align="center" gap={2}>
                                                    <Checkbox.Root
                                                        checked={
                                                            isCategoryChecked(category.processes)
                                                                ? true
                                                                : isCategoryIndeterminate(category.processes)
                                                                    ? "indeterminate"
                                                                    : false
                                                        }
                                                        onCheckedChange={() => toggleCategory(category.processes)}
                                                        colorPalette="green"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Checkbox.HiddenInput />
                                                        <Checkbox.Control />
                                                    </Checkbox.Root>
                                                    <Text fontWeight="medium" fontSize="sm">{category.name}</Text>
                                                </Flex>
                                                <Accordion.ItemIndicator>
                                                    <MdChevronRight />
                                                </Accordion.ItemIndicator>
                                            </Flex>
                                        </Accordion.ItemTrigger>

                                        <Accordion.ItemContent>
                                            <Box p={2} pl={8} bg="gray.50" borderRadius="md" mt={1}>
                                                <VStack align="start" gap={4}>
                                                    {category.processes.map((process) => (
                                                        <Checkbox.Root
                                                            key={process.id}
                                                            checked={value.includes(process.id)}
                                                            onCheckedChange={() => toggleProcess(process.id)}
                                                            colorPalette="green"
                                                        >
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                            <Checkbox.Label fontSize="sm">{process.label}</Checkbox.Label>
                                                        </Checkbox.Root>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        </Accordion.ItemContent>
                                    </Accordion.Item>
                                ))}
                            </Accordion.Root>
                        </>
                    ) : (
                        // 空状態 - 案内ボックス
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
                                上記で工事種別を選択すると、工程が表示されます。
                            </Text>
                        </Flex>
                    )}
                </VStack>
            </ContentBox>
        </Box>
    );
};