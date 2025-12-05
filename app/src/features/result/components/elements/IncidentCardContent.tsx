// src/features/result/components/elements/IncidentCardContent.tsx
import { Box, Collapsible, HStack, Icon, Separator, Stack, Text } from "@chakra-ui/react";
import { FiInfo, FiShield } from "react-icons/fi";
import { CountermeasureItem } from "@/features/result/components/elements/CountermeasureItem";
import type { IncidentData } from "@/features/result/types";

type Props = {
    incident: IncidentData;
    isOpen: boolean;
};

export const IncidentCardContent = ({ incident, isOpen }: Props) => {
    return (
        <Collapsible.Root open={isOpen}>
            <Collapsible.Content>
                <Box p={5} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <Stack gap={6}>
                        {/* 1. 概要セクション（推奨デザイン：ボックス化） */}
                        <Box
                            bg="purple.50"
                            p={4}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor="purple.100"
                        >
                            <Stack gap={2}>
                                <HStack gap={2} align="center">
                                    <Icon as={FiInfo} color="purple.500" boxSize={5} />
                                    <Text fontWeight="bold" fontSize="sm" color="purple.900">
                                        概要
                                    </Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.800" lineHeight="1.7">
                                    {incident.description}
                                </Text>
                            </Stack>
                        </Box>

                        {/* 2. 対応策セクション */}
                        <Box>
                            {/* 見出し */}
                            <HStack mb={4} gap={4}>
                                <HStack gap={2} minW="fit-content">
                                    <Icon as={FiShield} color="blue.500" boxSize={4} />
                                    <Text fontSize="sm" fontWeight="bold" color="gray.500">
                                        対応策リスト
                                    </Text>
                                </HStack>
                                <Separator flex="1" borderColor="gray.200" />
                            </HStack>

                            {/* リスト本体 */}
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