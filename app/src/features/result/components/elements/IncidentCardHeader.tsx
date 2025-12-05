// src/features/result/components/elements/IncidentCardHeader.tsx
import { Badge, Box, Flex, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { HiSparkles } from "react-icons/hi";
import { MdChevronRight, MdExpandMore, MdWarning } from "react-icons/md";
import type { IncidentData } from "@/features/result/types";

type Props = {
    incident: IncidentData;
    isOpen: boolean;
    onToggle: () => void;
};

export const IncidentCardHeader = ({ incident, isOpen, onToggle }: Props) => {
    return (
        <Flex
            p={4}
            borderLeft="4px solid"
            borderLeftColor={incident.borderColor}
            align="center"
            justify="space-between"
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            onClick={onToggle}
            bg="white" // 背景色を明示
        >
            <Stack gap={1} flex={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                    {incident.caseNumber}
                </Text>
                <Text fontSize="sm" fontWeight="bold" lineHeight="short">
                    {incident.title}
                </Text>
                <Box>
                    <Badge
                        variant="surface"
                        colorPalette={incident.badgeType === "past" ? "orange" : "pink"}
                        size="sm"
                    >
                        <HStack gap={1}>
                            <Icon as={incident.badgeType === "past" ? MdWarning : HiSparkles} />
                            <Text>
                                {incident.badgeType === "past"
                                    ? "過去に起こったインシデント"
                                    : "AIが想定したインシデント"}
                            </Text>
                        </HStack>
                    </Badge>
                </Box>
            </Stack>
            <Icon
                as={isOpen ? MdExpandMore : MdChevronRight}
                boxSize={6}
                color="gray.400"
            />
        </Flex>
    );
};