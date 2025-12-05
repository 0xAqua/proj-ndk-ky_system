// src/components/result/elements/CountermeasureItem.tsx
import { Badge, Box, Flex, Text } from "@chakra-ui/react";
import { FiCheckCircle, FiFileText, FiUsers } from "react-icons/fi";
import type {CountermeasureData} from "@/features/result/types";

type Props = {
    measure: CountermeasureData;
};

export const CountermeasureItem = ({ measure }: Props) => {
    return (
        <>
            {/* タイトル */}
            <Flex align="center" gap={2}>
                <FiCheckCircle color="blue" size={16} />
                <Text fontSize="sm" fontWeight="bold">
                    {measure.title}
                </Text>
            </Flex>

            {/* 実施内容 */}
            <Box w="full" mt={2}>
                <Flex align="center" gap={2} mb={1.5}>
                    <FiFileText size={14} color="#38A169" />
                    <Text fontSize="sm" fontWeight="bold" letterSpacing="wide">
                        実施内容
                    </Text>
                </Flex>
                <Text
                    fontSize="sm"
                    color="gray.700"
                    lineHeight="1.6"
                    pl={5}
                >
                    {measure.content}
                </Text>
            </Box>

            {/* 実施者 */}
            {!!measure.implementers.length && (
                <Box w="full" mt={2}>
                    <Flex align="center" gap={2} mb={1.5}>
                        <FiUsers size={14} color="#D69E2E" />
                        <Text fontSize="sm" fontWeight="bold" letterSpacing="wide">
                            実施者
                        </Text>
                    </Flex>
                    <Flex gap={2} flexWrap="wrap" pl={5}>
                        {measure.implementers.map((person, idx) => (
                            <Badge key={idx} size="sm" colorPalette="blue">
                                {person}
                            </Badge>
                        ))}
                    </Flex>
                </Box>
            )}
        </>
    );
};
