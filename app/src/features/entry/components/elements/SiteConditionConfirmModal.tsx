import {
    Dialog,
    Button,
    VStack,
    Text,
    Box,
    Flex,
    Separator,
    Badge
} from "@chakra-ui/react";
import {MdCalendarToday, MdCheckCircle, MdConstruction, MdInfoOutline, MdListAlt, MdLocationOn} from "react-icons/md";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

import { useSiteConditionConfirmData } from "@/features/entry/hooks/useSiteConditionConfirmData";

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
                                              constructions = [],
                                              selectedTypeIds = [],
                                              selectedProcessIds = [],
                                              masterEnvironments = [],
                                              value: selectedEnvIds = []
                                          }: Props) => {

    // ★ロジックはこれ一行で完結
    const { typeNames, envItemsDisplay } = useSiteConditionConfirmData({
        open,
        constructions,
        masterEnvironments,
        selectedTypeIds,
        selectedProcessIds,
        selectedEnvIds
    });

    // 小さなUIコンポーネントは同じファイル内に定義してもOK（あるいは別ファイルへ）
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
            <Dialog.Backdrop bg="blackAlpha.500" />

            <Dialog.Positioner>
                <Dialog.Content
                    borderRadius="xl"
                    bg="white"
                    w={{ base: "100%", md: "480px" }}
                    maxW="100vw"
                    mx={4}
                >
                    <Dialog.Header fontWeight="bold" fontSize="lg" py={4}>
                        <Text>入力内容の確認</Text>
                    </Dialog.Header>

                    <Dialog.Body py={6}>
                        <VStack align="stretch" gap={6}>
                            <Box bg="orange.50" p={4} borderRadius="md">
                                <Text fontSize="sm" color="orange.800" fontWeight="bold">
                                    以下の内容でよろしいですか？
                                </Text>
                            </Box>

                            {/* 日付 */}
                            <Box>
                                <SectionHeader icon={MdCalendarToday} title="工事実施日" />
                                <Text fontSize="lg" fontWeight="bold" ps={6}>
                                    {date}
                                </Text>
                            </Box>

                            <Separator borderColor="gray.100" />

                            {/* 工事種別 */}
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

                            {/* 工程 */}
                            <Box>
                                <SectionHeader icon={MdListAlt} title="実施工程" />
                                <VStack align="stretch" gap={3} ps={6}>
                                    {(() => {
                                        const groupedProcesses = constructions
                                            .map((category) => {
                                                const targetList = category.processes || [];
                                                const selectedItems = targetList.filter((p) =>
                                                    selectedProcessIds.includes(p.id)
                                                );

                                                return {
                                                    categoryName: category.name,
                                                    items: selectedItems
                                                };
                                            })
                                            .filter((group) => group.items.length > 0);

                                        if (groupedProcesses.length === 0) {
                                            return <Text color="gray.400" fontSize="sm">未選択</Text>;
                                        }

                                        return groupedProcesses.map((group) => (
                                            <Box
                                                key={group.categoryName}
                                                bg="gray.50"
                                                p={3}
                                                borderRadius="md"
                                                border="1px solid"
                                                borderColor="gray.100"
                                            >
                                                {/* カテゴリ名 */}
                                                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                                                    {group.categoryName}
                                                </Text>

                                                {/* チェックリスト風の表示 */}
                                                <Flex wrap="wrap" gap={3}>
                                                    {group.items.map((item) => (
                                                        <Flex key={item.id} align="center" gap={1.5}>
                                                            <Box as={MdCheckCircle} color="green.500" boxSize="16px" />
                                                            <Text fontSize="sm" fontWeight="bold" color="gray.700">
                                                                {item.label}
                                                            </Text>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </Box>
                                        ));
                                    })()}
                                </VStack>
                            </Box>

                            <Separator borderColor="gray.100" />

                            {/* 現場状況 */}
                            <Box>
                                <SectionHeader icon={MdLocationOn} title="現場状況・環境" />
                                {envItemsDisplay.length === 0 ? (
                                    <Text color="gray.400" fontSize="sm" ps={6}>特になし</Text>
                                ) : (
                                    <VStack align="stretch" gap={3} ps={6}>
                                        {(() => {
                                            // ▼ フラットな配列をカテゴリごとにグループ化する
                                            const groupedEnv = envItemsDisplay.reduce((acc, item) => {
                                                if (!acc[item.categoryName]) {
                                                    acc[item.categoryName] = [];
                                                }
                                                acc[item.categoryName].push(item.label);
                                                return acc;
                                            }, {} as Record<string, string[]>);

                                            return Object.entries(groupedEnv).map(([categoryName, labels]) => (
                                                <Box
                                                    key={categoryName}
                                                    bg="gray.50"
                                                    p={3}
                                                    borderRadius="md"
                                                    border="1px solid"
                                                    borderColor="gray.100"
                                                >
                                                    {/* カテゴリ名 */}
                                                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                                                        {categoryName}
                                                    </Text>

                                                    {/* 項目リスト（タグ風に表示して状況・条件であることを強調） */}
                                                    <Flex wrap="wrap" gap={2}>
                                                        {labels.map((label, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="surface"
                                                                colorPalette="orange"
                                                                px={2}
                                                                py={1}
                                                                borderRadius="md"
                                                                textTransform="none"
                                                                fontSize="sm"
                                                                fontWeight="medium"
                                                            >
                                                                <Flex align="center" gap={1}>
                                                                    <MdInfoOutline />
                                                                    {label}
                                                                </Flex>
                                                            </Badge>
                                                        ))}
                                                    </Flex>
                                                </Box>
                                            ));
                                        })()}
                                    </VStack>
                                )}
                            </Box>
                        </VStack>
                    </Dialog.Body>

                    <Dialog.Footer
                        bg="gray.50"
                        borderBottomRadius="xl"
                        borderTopWidth="1px"
                        borderColor="gray.100"
                    >
                        <Flex w="full" justify="flex-end" gap={3}>
                            <Button
                                variant="outline"
                                color="gray.600"
                                borderColor="gray.300"
                                bg="white"
                                _hover={{ bg: "gray.50" }}
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                戻る
                            </Button>

                            <Button
                                colorPalette="green"
                                onClick={onSubmit}
                                loading={isSubmitting}
                                loadingText="送信中"
                                px={8}
                                boxShadow="0 2px 8px rgba(52, 199, 89, 0.3)"
                            >
                                確定する
                            </Button>
                        </Flex>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};