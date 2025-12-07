import {
    Dialog,
    Button,
    VStack,
    Text,
    Box,
    Flex,
    Separator,
    IconButton,
    Badge
} from "@chakra-ui/react";
import { MdClose, MdCalendarToday, MdConstruction, MdListAlt, MdLocationOn } from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";
import { useMemo } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: () => void;
    isSubmitting?: boolean;

    date: string;
    constructions: ProcessCategory[];
    selectedTypeIds: string[];
    selectedProcessIds: string[];

    masterEnvironments: ProcessCategory[];
    value: string[];
};

export const SiteConditionConfirmModal = ({
                                              open,
                                              onClose,
                                              onSubmit,
                                              isSubmitting,
                                              date,
                                              // ★修正: 以下の配列プロパティにデフォルト値 [] を設定して、undefinedエラーを防ぐ
                                              constructions = [],
                                              selectedTypeIds = [],
                                              selectedProcessIds = [],
                                              masterEnvironments = [],
                                              value: selectedEnvIds = []
                                          }: Props) => {

    // ──────────────────────────────────────────────
    // 名称解決ヘルパー
    // ──────────────────────────────────────────────
    const findNameById = (categories: ProcessCategory[], id: string): string | null => {
        // categories が万が一 undefined の場合のガード
        if (!categories) return null;

        for (const cat of categories) {
            if (cat.id === id) return cat.name;
            if (cat.processes) {
                const foundProcess = cat.processes.find(p => p.id === id);
                if (foundProcess) return foundProcess.label;
            }
            if (cat.children) {
                const foundInChildren = findNameById(cat.children, id);
                if (foundInChildren) return foundInChildren;
            }
        }
        return null;
    };

    // 1. 工事種別の名称リスト作成
    const typeNames = useMemo(() => {
        // selectedTypeIds が [] (空) なら安全に空配列が返る
        return selectedTypeIds
            .map(id => findNameById(constructions, id))
            .filter((name): name is string => name !== null);
    }, [constructions, selectedTypeIds]);

    // 2. 工程の名称リスト作成
    const processNames = useMemo(() => {
        return selectedProcessIds
            .map(id => findNameById(constructions, id))
            .filter((name): name is string => name !== null);
    }, [constructions, selectedProcessIds]);

    // 3. 現場状況の表示データ作成
    const envItemsDisplay = useMemo(() => {
        const results: { categoryName: string; label: string }[] = [];
        const traverse = (categories: ProcessCategory[], parentNames: string[] = []) => {
            if (!categories) return; // ガード
            categories.forEach(cat => {
                if (cat.processes) {
                    cat.processes.forEach(proc => {
                        if (selectedEnvIds.includes(proc.id)) {
                            results.push({
                                categoryName: parentNames.concat(cat.name).join(" > "),
                                label: proc.label
                            });
                        }
                    });
                }
                if (cat.children) traverse(cat.children, [...parentNames, cat.name]);
            });
        };
        traverse(masterEnvironments);
        return results;
    }, [masterEnvironments, selectedEnvIds]);

    // 共通の見出しコンポーネント
    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <Flex align="center" gap={2} mb={2} color="gray.600">
            <Icon />
            <Text fontWeight="bold" fontSize="sm">{title}</Text>
        </Flex>
    );

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => !e.open && onClose()}
            size="xl"
            scrollBehavior="inside"
        >
            <Dialog.Backdrop bg="blackAlpha.300" backdropFilter="blur(5px)" />

            <Dialog.Positioner>
                <Dialog.Content borderRadius="xl" bg="white">
                    <Dialog.Header fontWeight="bold" fontSize="lg" display="flex" justifyContent="space-between" alignItems="center">
                        <Text>登録内容の確認</Text>
                        <Dialog.CloseTrigger asChild>
                            <IconButton variant="ghost" size="sm" aria-label="閉じる">
                                <MdClose size={20} />
                            </IconButton>
                        </Dialog.CloseTrigger>
                    </Dialog.Header>

                    <Dialog.Body py={6}>
                        <VStack align="stretch" gap={6}>
                            <Box bg="orange.50" p={4} borderRadius="md">
                                <Text fontSize="sm" color="orange.800" fontWeight="bold">
                                    以下の内容で登録します。よろしいですか？
                                </Text>
                            </Box>

                            {/* 1. 日付 */}
                            <Box>
                                <SectionHeader icon={MdCalendarToday} title="工事実施日" />
                                <Text fontSize="lg" fontWeight="bold" ps={6}>
                                    {date}
                                </Text>
                            </Box>

                            <Separator borderColor="gray.100" />

                            {/* 2. 工事種別 */}
                            <Box>
                                <SectionHeader icon={MdConstruction} title="工事種別" />
                                <Flex wrap="wrap" gap={2} ps={6}>
                                    {typeNames.length > 0 ? (
                                        typeNames.map((name) => (
                                            <Badge key={name} colorPalette="blue" variant="solid" size="md">
                                                {name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <Text color="gray.400" fontSize="sm">未選択</Text>
                                    )}
                                </Flex>
                            </Box>

                            <Separator borderColor="gray.100" />

                            {/* 3. 工程 */}
                            <Box>
                                <SectionHeader icon={MdListAlt} title="実施工程" />
                                <VStack align="start" gap={1} ps={6}>
                                    {processNames.length > 0 ? (
                                        processNames.map((name) => (
                                            <Text key={name} fontWeight="medium">・{name}</Text>
                                        ))
                                    ) : (
                                        <Text color="gray.400" fontSize="sm">未選択</Text>
                                    )}
                                </VStack>
                            </Box>

                            <Separator borderColor="gray.100" />

                            {/* 4. 現場状況 */}
                            <Box>
                                <SectionHeader icon={MdLocationOn} title="現場状況・環境" />
                                {envItemsDisplay.length === 0 ? (
                                    <Text color="gray.400" fontSize="sm" ps={6}>特になし</Text>
                                ) : (
                                    <VStack align="start" gap={3} w="full" ps={6}>
                                        {envItemsDisplay.map((item, index) => (
                                            <Box key={index} w="full">
                                                <Text fontSize="xs" color="gray.500" mb={0.5}>
                                                    {item.categoryName}
                                                </Text>
                                                <Text fontSize="md" fontWeight="bold" color="gray.800" ps={2} borderLeft="3px solid" borderColor="green.400">
                                                    {item.label}
                                                </Text>
                                            </Box>
                                        ))}
                                    </VStack>
                                )}
                            </Box>
                        </VStack>
                    </Dialog.Body>

                    <Dialog.Footer bg="gray.50" borderBottomRadius="xl">
                        <Dialog.CloseTrigger asChild>
                            <Button variant="ghost" mr={3} disabled={isSubmitting}>
                                戻る
                            </Button>
                        </Dialog.CloseTrigger>

                        <Button
                            colorPalette="green"
                            onClick={onSubmit}
                            loading={isSubmitting}
                            loadingText="送信中"
                            px={8}
                        >
                            確定する
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};