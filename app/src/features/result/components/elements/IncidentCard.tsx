// src/components/result/elements/IncidentCard.tsx
import {
    Badge,
    Box,
    Collapsible,
    Flex,
    Separator,
    Text,
    VStack,
} from "@chakra-ui/react";
import { HiSparkles } from "react-icons/hi";
import { MdChevronRight, MdExpandMore, MdWarning } from "react-icons/md";
import { FiInfo, FiShield } from "react-icons/fi";
import type { IncidentData } from "@/features/result/ResultForm.tsx";
import { CountermeasureItem } from "@/features/result/components/elements/CountermeasureItem";

type Props = {
    incident: IncidentData;
    isOpen: boolean;
    onToggle: () => void;
};

export const IncidentCard = ({ incident, isOpen, onToggle }: Props) => {
    return (
        <Box borderRadius="md" overflow="hidden" bg="white">
            {/* インシデントヘッダー */}
            <Flex
                pl={4}
                py={3}
                pr={2}
                borderLeft="3px solid"
                borderLeftColor={incident.borderColor}
                align="center"
                justify="space-between"
                cursor="pointer"
                _active={{ bg: "gray.100" }}
                onClick={onToggle}
            >
                <VStack align="start" gap={2} flex={1}>
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                        {incident.caseNumber}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                        {incident.title}
                    </Text>
                    <Badge
                        variant="solid"
                        colorPalette={incident.badgeType === "past" ? "orange" : "pink"}
                        size="xs"
                    >
                        {incident.badgeType === "past" ? (
                            <>
                                <MdWarning size={12} />
                                過去に起こったインシデント
                            </>
                        ) : (
                            <>
                                <HiSparkles size={12} />
                                AIが想定したインシデント
                            </>
                        )}
                    </Badge>
                </VStack>
                {isOpen ? (
                    <MdExpandMore size={20} color="gray" />
                ) : (
                    <MdChevronRight size={20} color="gray" />
                )}
            </Flex>

            {/* 詳細（Collapsible） */}
            <Collapsible.Root open={isOpen}>
                <Collapsible.Content>
                    <Box p={4}>
                        {/* 概要 */}
                        <Box bg="white">
                            <Flex align="center" gap={2} mb={2} ml={1}>
                                <FiInfo size={18} color="#805AD5" />
                                <Text fontWeight="bold">概要</Text>
                            </Flex>
                            <Text fontSize="sm" color="gray.700" pl={7}>
                                {incident.description}
                            </Text>
                        </Box>

                        <Box bg="white" my={4} rounded="md" ml={1.5}>
                            <Flex align="center" gap={2} mb={2}>
                                <FiShield size={18} color="blue" />
                                <Text fontSize="md" fontWeight="bold">
                                    対応策
                                </Text>
                            </Flex>
                        </Box>

                        {/* 対応策リスト */}
                        <VStack gap={4}>
                            {incident.countermeasures.map((measure, idx) => (
                                <Box key={idx} bg="white" rounded="lg" p={2} w="full">
                                    <VStack align="start" gap={3} w="full">
                                        {/* タイトル */}
                                        <CountermeasureItem measure={measure} />
                                        <Separator variant="solid" w="full" />
                                    </VStack>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                </Collapsible.Content>
            </Collapsible.Root>
        </Box>
    );
};
