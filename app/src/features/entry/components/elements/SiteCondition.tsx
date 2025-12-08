import { VStack, Text, Flex, Box, Accordion } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdLocationOn } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";
import { useMemo, useCallback } from "react";
import { SiteConditionItem } from "@/features/entry/components/elements/SiteConditionItem";

type Props = {
    masterEnvironments: ProcessCategory[];
    value: string[];
    onChange: (value: string[]) => void;
};

export const SiteCondition = ({ masterEnvironments, value = [], onChange }: Props) => {

    // 1. パフォーマンス対策: マップ作成
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

    // 2. 個別アイテム切り替え
    const handleToggleItem = useCallback((id: string) => {
        const nextValue = value.includes(id)
            ? value.filter((v) => v !== id)
            : [...value, id];
        onChange(nextValue);
    }, [onChange, value]);

    // 3. グループ一括切り替え
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
                    {/* ヘッダー */}
                    <Flex align="center" gap={2}>
                        <MdLocationOn size={16} color="#34C759" />
                        <Text fontWeight="bold" fontSize="sm">現場状況・環境</Text>
                        <Text color="red.500" fontSize="sm">*</Text>
                    </Flex>

                    <Text fontSize="xs" color="gray.500">
                        該当する現場の状況を選択してください。（複数選択可）
                    </Text>

                    {/* アコーディオン本体 */}
                    <Accordion.Root multiple w="full" variant="outline">
                        {masterEnvironments.map((largeCat) => (
                            <SiteConditionItem
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