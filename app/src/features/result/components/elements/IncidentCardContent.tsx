// src/features/result/components/elements/IncidentCardContent.tsx
import { Box, Collapsible, HStack, Icon, Separator, Stack, Text } from "@chakra-ui/react";
import { FiShield, FiInfo } from "react-icons/fi"; // FiInfo（インフォメーション）を使う
import { CountermeasureItem } from "@/features/result/components/elements/CountermeasureItem";
import type { IncidentData } from "@/features/result/types";

type Props = {
    incident: IncidentData;
    isOpen: boolean;
};

export const IncidentCardContent = ({ incident, isOpen }: Props) => {
    const isPast = incident.badgeType === "past";

    // 色とテキストは動的に変えるが、アイコンは固定する
    const themeColor = isPast ? "orange" : "pink";
    const summaryTitle = isPast ? "過去インシデントの概要" : "AIシミュレーションの概要";

    return (
        <Collapsible.Root open={isOpen}>
            <Collapsible.Content>
                <Box p={5} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <Stack gap={6}>

                        {/* 概要ボックス */}
                        <Box
                            bg={`${themeColor}.50`}
                            p={4}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor={`${themeColor}.100`}
                        >
                            <Stack gap={2}>
                                <HStack gap={2} align="center">
                                    {/* ★ここを修正: アイコンは常に FiInfo (iマーク) にする */}
                                    {/* 色はテーマカラー(ピンク/オレンジ)を使うことで関連性を持たせる */}
                                    <Icon as={FiInfo} color={`${themeColor}.500`} boxSize={5} />

                                    <Text fontWeight="bold" fontSize="sm" color={`${themeColor}.800`}>
                                        {summaryTitle}
                                    </Text>
                                </HStack>

                                <Text fontSize="sm" color="gray.800" lineHeight="1.7">
                                    {incident.description}
                                </Text>
                            </Stack>
                        </Box>

                        {/* 対応策セクション */}
                        <Box>
                            <HStack mb={4} gap={4}>
                                <HStack gap={2} minW="fit-content">
                                    <Icon as={FiShield} color="blue.500" boxSize={4} />
                                    <Text fontSize="sm" fontWeight="bold" color="gray.500">
                                        対応策リスト
                                    </Text>
                                </HStack>
                                <Separator flex="1" borderColor="gray.200" />
                            </HStack>

                            <Stack gap={4}>
                                {incident.countermeasures.map((measure, idx) => (
                                    <CountermeasureItem key={idx} measure={measure} />
                                ))}
                            </Stack>
                        </Box>

                    </Stack>
                </Box>
            </Collapsible.Content>
        </Collapsible.Root>
    );
};