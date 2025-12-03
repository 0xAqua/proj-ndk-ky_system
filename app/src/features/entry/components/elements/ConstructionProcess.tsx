import { Checkbox, Flex, Text, Box, VStack, Accordion } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdBuild, MdChevronRight } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

type Props = {
    // 親から受け取るマスタデータ (EntryFormから渡される constructions)
    masterCategories: ProcessCategory[];
    // 表示対象の種別IDリスト (ConstructionWorkUiで選ばれたもの)
    targetTypeIds: string[];
    // 選択された工程ID (実際に保存する値)
    value: string[];
    onChange: (value: string[]) => void;
};

// ★修正: フック呼び出しを削除し、Propsで受け取る形に変更
export const ConstructionProcess = ({ masterCategories, targetTypeIds, value = [], onChange }: Props) => {

    // ★重要: 受け取ったマスタデータの中から、選択された種別ID(targetTypeIds)に一致するものだけを抽出
    const visibleCategories = masterCategories.filter(cat =>
        targetTypeIds.includes(cat.id)
    );

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

    // 表示すべきデータがない場合は何もレンダリングしない
    if (visibleCategories.length === 0) {
        return null;
    }

    return (
        <Box bg="white" w="full" borderRadius="lg">
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    <Flex align="center" gap={2}>
                        <MdBuild size={16} color="#007AFF" />
                        <Text fontWeight="bold" fontSize="sm">工事工程</Text>
                        <Text color="red.500" fontSize="sm">*</Text>
                    </Flex>

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
                                                checked={isCategoryChecked(category.processes)}
                                                onCheckedChange={() => toggleCategory(category.processes)}
                                                colorPalette="blue"
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
                                                    colorPalette="blue"
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
                </VStack>
            </ContentBox>
        </Box>
    );
};