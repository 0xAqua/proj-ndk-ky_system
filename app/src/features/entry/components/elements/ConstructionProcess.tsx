// src/features/entry/components/ConstructionProcess.tsx

import { Checkbox, Flex, Text, Box, VStack, Accordion, Alert, Spinner, Center } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdBuild, MdChevronRight } from "react-icons/md";
// 必要な型とHookをインポート
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";
import { useUserStore } from "@/stores/useUserStore";

type Props = {
    value: string[];
    onChange: (value: string[]) => void;
};

export const ConstructionProcess = ({ value = [], onChange }: Props) => {
    // Hooksから「整形済みのデータ」と「状態」を取得
    const { categories, isLoading, error } = useConstructionMaster();
    // エラー表示のため、Storeから部署名を取得
    const { departments } = useUserStore();

    // ──────────────────────────────────────────
    // チェックボックス制御ロジック (UI操作)
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

    // ──────────────────────────────────────────
    // レンダリング (UI)
    // ──────────────────────────────────────────

    if (isLoading) {
        return (
            <Box bg="white" w="full" borderRadius="lg" p={4}>
                <ContentBox>
                    <Center py={8}>
                        <Spinner size="lg" color="blue.500" />
                        <Text mt={4} fontSize="sm" color="gray.500">マスタデータを読み込んでいます...</Text>
                    </Center>
                </ContentBox>
            </Box>
        );
    }

    if (error) {
        return <Text color="red.500">エラー: {error}</Text>;
    }

    // categories は Hooks が整形してくれた最終データ
    if (categories.length === 0) {
        return (
            <Alert.Root status="warning" borderRadius="md">
                <Alert.Indicator />
                <Text fontSize="sm">
                    選択可能な工事工程がありません。<br/>
                    (所属部署: {departments.map(d => d.name).join(", ")})
                </Text>
            </Alert.Root>
        );
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
                        {categories.map((category) => (
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