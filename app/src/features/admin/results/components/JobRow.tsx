import {Badge, Box, Flex, HStack, Icon, Text, VStack} from "@chakra-ui/react";
import { formatDate } from "../utils/formatDate";
import { MdInsights } from "react-icons/md";
import type { VQJobListItem } from "../hooks/useVQJobs";
import {summarizeList} from "@/features/admin/results/utils/summarizeList.ts";

type Props = {
    job: VQJobListItem;
    onClick?: (jobId: string) => void;
    isSelected?: boolean;
};

export const JobRow = ({ job, onClick, isSelected = false }: Props) => {
    const displayName =
        [job.family_name, job.given_name].filter(Boolean).join(" ") || "（氏名未設定）";

    const typeSummary = summarizeList(job.type_names, 1);
    const fact = job.fact_incident_count ?? 0;
    const ai = job.ai_incident_count ?? 0;
    const total = fact + ai;
    const iconColor =
        fact > ai ? "orange.500" :
            ai > fact ? "pink.500" :
                "gray.600"; // 同数は中立

    return (
        <Box
            position="relative"
            px={4}
            py={3}
            borderBottom="1px solid"
            borderColor="gray.100"
            cursor="pointer"
            bg={isSelected ? "blue.50" : "white"}
            _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
            transition="background 0.12s"
            onClick={() => onClick?.(job.job_id)}
        >

            <Flex align="center" justify="space-between" gap={3}>
                <Box>
                    <VStack align="start">
                        <Text fontSize="xs" color="gray.500" mb={0.5}>工事種別</Text>
                        <HStack gap={2} align="center" minW={0}>
                            <Text fontSize="sm" color="gray.800" lineClamp={1} flex="1" minW={0}>
                                {typeSummary.primary}
                            </Text>
                            {typeSummary.restCount > 0 && (
                                <Badge
                                    variant="subtle"
                                    colorPalette="gray"
                                    borderRadius="full"
                                    px={2}
                                    py={0.5}
                                    fontSize="xs"
                                    fontWeight="medium"
                                    whiteSpace="nowrap"
                                >
                                    +{typeSummary.restCount}
                                </Badge>
                            )}

                        </HStack>
                        <HStack gap={2} minW={0}>
                            <Text fontSize="xs" color="gray.400" flexShrink={0}>
                                {formatDate(job.created_at)}
                            </Text>

                            <Text fontSize="xs" color="gray.600" minW={0} lineClamp={1}>
                                {displayName}
                            </Text>

                            <HStack gap={1} flexShrink={0}>
                                <Icon as={MdInsights} boxSize="16px" color={iconColor} />
                                <Text as="span" fontSize="xs" color="gray.600">
                                    {total} 件
                                </Text>
                            </HStack>
                        </HStack>


                    </VStack>
                </Box>
            </Flex>

        </Box>
    );
};
