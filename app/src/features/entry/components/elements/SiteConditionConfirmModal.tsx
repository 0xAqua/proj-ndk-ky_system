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
import { MdCalendarToday, MdConstruction, MdListAlt, MdLocationOn } from "react-icons/md";
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
    const { typeNames, processNames, envItemsDisplay } = useSiteConditionConfirmData({
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
                    w={{ base: "95%", md: "500px" }}
                    maxW="100vw"
                >
                    <Dialog.Header fontWeight="bold" fontSize="lg" py={4}>
                        <Text>登録内容の確認</Text>
                    </Dialog.Header>

                    <Dialog.Body py={6}>
                        <VStack align="stretch" gap={6}>
                            <Box bg="orange.50" p={4} borderRadius="md">
                                <Text fontSize="sm" color="orange.800" fontWeight="bold">
                                    以下の内容で登録します。よろしいですか？
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

                            {/* 現場状況 */}
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