import { VStack, Flex, Accordion, Checkbox } from "@chakra-ui/react";
import { MdChevronRight } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster.ts";

// Propsの型定義もこちら（もしくは共有の型定義ファイル）に移動
export type SiteConditionItemProps = {
    category: ProcessCategory;
    level: number;
    value: string[];
    // マップの型は Map<string, string[]> です
    categoryLeafMap: Map<string, string[]>;
    onToggleGroup: (ids: string[]) => void;
    onToggleItem: (id: string) => void;
};

export const SiteConditionItem = ({
                                      category,
                                      level,
                                      value,
                                      categoryLeafMap,
                                      onToggleGroup,
                                      onToggleItem
                                  }: SiteConditionItemProps) => {

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

                        {/* 親コンポーネントでTextなどをインポートしなくて済むよう、ここで完結させる */}
                        <div style={{ fontWeight: level === 0 ? "bold" : "medium", fontSize: "0.875rem" }}>
                            {category.name}
                        </div>
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

                    {/* 子カテゴリ（再帰）: 自分自身(SiteConditionItem)を呼ぶ */}
                    {hasChildren && (
                        <Accordion.Root multiple w="full">
                            {category.children!.map((child) => (
                                <SiteConditionItem
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