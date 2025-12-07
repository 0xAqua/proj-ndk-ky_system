import { VStack, Text, Flex, Box, Accordion, Checkbox } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdLocationOn, MdChevronRight } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";
import { useMemo, useCallback } from "react";

// ──────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────
type Props = {
    masterEnvironments: ProcessCategory[];
    value: string[];
    onChange: (value: string[]) => void;
};

type AccordionItemProps = {
    category: ProcessCategory;
    level: number;
    value: string[];
    categoryLeafMap: Map<string, string[]>;
    onToggleGroup: (ids: string[]) => void;
    onToggleItem: (id: string) => void;
};

// ──────────────────────────────────────────
// 再帰用コンポーネント
// ──────────────────────────────────────────
const CategoryAccordionItem = ({
                                   category,
                                   level,
                                   value,
                                   categoryLeafMap,
                                   onToggleGroup,
                                   onToggleItem
                               }: AccordionItemProps) => {

    const allLeafIds = categoryLeafMap.get(category.id) || [];

    const getGroupStatus = () => {
        if (allLeafIds.length === 0) return { checked: false, indeterminate: false };
        let selectedCount = 0;
        for (const id of allLeafIds) {
            if (value.includes(id)) selectedCount++;
        }
        const allSelected = selectedCount === allLeafIds.length;
        const someSelected = selectedCount > 0 && !allSelected;
        return { checked: allSelected, indeterminate: someSelected };
    };

    const groupStatus = getGroupStatus();
    const hasChildren = category.children && category.children.length > 0;
    const hasProcesses = category.processes && category.processes.length > 0;

    if (!hasChildren && !hasProcesses) return null;

    return (
        <Accordion.Item
            value={category.id}
            borderBottomWidth={level === 0 ? "1px" : "0"}
            borderColor="gray.200"
        >
            <Accordion.ItemTrigger py={3} _hover={{ bg: "gray.50" }} cursor="pointer">
                <Flex justify="space-between" align="center" w="full">
                    <Flex align="center" gap={3}>
                        <Checkbox.Root
                            checked={groupStatus.indeterminate ? "indeterminate" : groupStatus.checked}
                            onCheckedChange={() => onToggleGroup(allLeafIds)}
                            colorPalette="green"
                            size="md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                        </Checkbox.Root>

                        <Text fontWeight={level === 0 ? "bold" : "medium"} fontSize="sm">
                            {category.name}
                        </Text>
                    </Flex>
                    <Accordion.ItemIndicator>
                        <MdChevronRight />
                    </Accordion.ItemIndicator>
                </Flex>
            </Accordion.ItemTrigger>

            <Accordion.ItemContent ps={6} pb={0}>
                <VStack align="start" gap={0} w="full">

                    {/* 小項目（プロセス） */}
                    {hasProcesses && category.processes.map((item) => (
                        <Flex
                            key={item.id}
                            align="center"
                            gap={3}
                            w="full"
                            py={3}
                            _hover={{ bg: "gray.50" }}
                        >
                            <Checkbox.Root
                                checked={value.includes(item.id)}
                                onCheckedChange={() => onToggleItem(item.id)}
                                colorPalette="green"
                                size="md"
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label fontSize="sm" color="gray.700" fontWeight="normal">
                                    {item.label}
                                </Checkbox.Label>
                            </Checkbox.Root>
                        </Flex>
                    ))}

                    {/* 子カテゴリ（再帰） */}
                    {hasChildren && (
                        /* 修正2: variant="unstyled" を削除（型エラー回避） */
                        <Accordion.Root multiple w="full">
                            {category.children!.map((child) => (
                                <CategoryAccordionItem
                                    key={child.id}
                                    category={child}
                                    level={level + 1}
                                    value={value}
                                    categoryLeafMap={categoryLeafMap}
                                    onToggleGroup={onToggleGroup}
                                    onToggleItem={onToggleItem}
                                />
                            ))}
                        </Accordion.Root>
                    )}
                </VStack>
            </Accordion.ItemContent>
        </Accordion.Item>
    );
};


// ──────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────
export const SiteCondition = ({ masterEnvironments, value = [], onChange }: Props) => {

    const categoryLeafMap = useMemo(() => {
        const map = new Map<string, string[]>();
        const collectIds = (cat: ProcessCategory): string[] => {
            let ids: string[] = [];
            if (cat.processes?.length) ids = ids.concat(cat.processes.map(p => p.id));
            if (cat.children?.length) cat.children.forEach(child => ids = ids.concat(collectIds(child)));
            map.set(cat.id, ids);
            return ids;
        };
        masterEnvironments.forEach(collectIds);
        return map;
    }, [masterEnvironments]);

    // 修正1: prevを使わず、直接新しい配列を計算して渡す
    const handleToggleItem = useCallback((id: string) => {
        const nextValue = value.includes(id)
            ? value.filter((v) => v !== id)
            : [...value, id];
        onChange(nextValue);
    }, [onChange, value]);

    const handleToggleGroup = useCallback((ids: string[]) => {
        if (ids.length === 0) return;
        const allSelected = ids.every(id => value.includes(id));
        if (allSelected) {
            onChange(value.filter(id => !ids.includes(id)));
        } else {
            const newIds = ids.filter(id => !value.includes(id));
            onChange([...value, ...newIds]);
        }
    }, [onChange, value]);

    if (masterEnvironments.length === 0) return null;

    return (
        <Box bg="white" w="full" p={2} borderRadius="2xl" boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)" >
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    <Flex align="center" gap={2}>
                        <MdLocationOn size={16} color="#34C759" />
                        <Text fontWeight="bold" fontSize="sm">現場状況・環境</Text>
                        <Text color="red.500" fontSize="sm">*</Text>
                    </Flex>

                    <Text fontSize="xs" color="gray.500">
                        該当する現場の状況を選択してください。（複数選択可）
                    </Text>

                    {/* ルートレベル */}
                    <Accordion.Root multiple w="full" variant="outline">
                        {masterEnvironments.map((largeCat) => (
                            <CategoryAccordionItem
                                key={largeCat.id}
                                category={largeCat}
                                level={0}
                                value={value}
                                categoryLeafMap={categoryLeafMap}
                                onToggleGroup={handleToggleGroup}
                                onToggleItem={handleToggleItem}
                            />
                        ))}
                    </Accordion.Root>
                </VStack>
            </ContentBox>
        </Box>
    );
};