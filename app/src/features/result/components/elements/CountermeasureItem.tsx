// CountermeasureItem.tsx (先ほどの最終案を採用)
import { Badge, Box, Flex, Text, Stack, HStack, Icon } from "@chakra-ui/react";
import { FiCheckCircle, FiFileText, FiUsers } from "react-icons/fi";
import type { CountermeasureData } from "@/features/result/types";

type Props = {
    measure: CountermeasureData;
};

export const CountermeasureItem = ({ measure }: Props) => {
    return (
        <Box
            w="full"
            pl={4} // インデントを少し確保
            borderLeftWidth="3px"
            borderLeftColor="blue.500"
            py={1}
        >
            <Stack gap={4}>
                {/* タイトル */}
                <HStack gap={2} align="flex-start">
                    <Icon as={FiCheckCircle} color="blue.500" boxSize={5} mt={0.5} />
                    <Text fontSize="sm" fontWeight="bold" color="gray.900" lineHeight="short">
                        {measure.title}
                    </Text>
                </HStack>

                {/* 内容（マイクロラベル付き） */}
                <Box pl={7}>
                    <HStack gap={1.5} mb={1} align="center">
                        <Icon as={FiFileText} size="xs" color="gray.400" />
                        <Text fontSize="xs" fontWeight="bold" color="gray.500">
                            実施内容
                        </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                        {measure.content}
                    </Text>
                </Box>

                {/* 担当者 */}
                {measure.implementers.length > 0 && (
                    <Box pl={7} mt={1}>
                        <Flex align="center" gap={3}>
                            <HStack gap={1.5}>
                                <Icon as={FiUsers} size="xs" color="gray.400" />
                                <Text fontSize="xs" fontWeight="bold" color="gray.500">
                                    担当者
                                </Text>
                            </HStack>
                            <Flex gap={2} flexWrap="wrap">
                                {measure.implementers.map((person, idx) => (
                                    <Badge key={idx} variant="subtle" colorPalette="blue" size="sm">
                                        {person}
                                    </Badge>
                                ))}
                            </Flex>
                        </Flex>
                    </Box>
                )}
            </Stack>
        </Box>
    );
};