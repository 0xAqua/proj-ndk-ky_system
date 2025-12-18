import { Box, Center, Flex, Icon, Stack, Text, Badge } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { HiSparkles, HiChevronRight } from "react-icons/hi";
import { MdWarning } from "react-icons/md";
import { formatDate } from "../utils/formatDate";
import type { VQJob } from "../hooks/useVQJobs";

interface JobCardProps {
    job: VQJob;
}

export const JobCard = ({ job }: JobCardProps) => {
    const navigate = useNavigate();
    const incidents = job.incidents || [];

    const handleClick = () => {
        navigate("/result", { state: { jobId: job.job_id } });
    };

    return (
        <Box
            as="article"
            position="relative"
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.100"
            cursor="pointer"
            onClick={handleClick}
            transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
            _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 12px 20px -8px rgba(0, 0, 0, 0.1)",
                borderColor: "blue.200",
            }}
        >
            {/* ヘッダー: 日付と件数 */}
            <Flex
                py={3}
                px={5}
                align="center"
                justify="space-between"
                bg="gray.50"
                borderTopRadius="xl"
                borderBottomWidth="1px"
                borderColor="gray.100"
            >
                <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wider">
                    {formatDate(job.created_at).toUpperCase()}
                </Text>
                <Badge colorScheme="blue" variant="subtle" px={2} borderRadius="full">
                    {incidents.length} Incidents
                </Badge>
            </Flex>

            {/* コンテンツエリア */}
            <Box px={5} py={5}>
                <Stack gap={3}>
                    {incidents.slice(0, 3).map((incident) => {
                        const isPast = incident.classification === "過去に起きたインシデント";
                        const themeColor = isPast ? "orange" : "purple";
                        const StatusIcon = isPast ? MdWarning : HiSparkles;

                        return (
                            <Box
                                key={incident.id}
                                p={3}
                                borderRadius="lg"
                                bg={`${themeColor}.50`}
                                border="1px solid"
                                borderColor={`${themeColor}.100`}
                            >
                                <Flex gap={3} align="flex-start">
                                    <Center
                                        boxSize="24px"
                                        bg="white"
                                        borderRadius="full"
                                        shadow="sm"
                                        flexShrink={0}
                                    >
                                        <Icon as={StatusIcon} boxSize={3.5} color={`${themeColor}.500`} />
                                    </Center>
                                    <Box flex={1}>
                                        <Text
                                            fontSize="sm"
                                            color="gray.800"
                                            fontWeight="bold"
                                            lineHeight="1.4"
                                        >
                                            {incident.title}
                                        </Text>
                                        <Text
                                            fontSize="xs"
                                            color="gray.600"
                                            mt={1}
                                            lineHeight="1.5"
                                        >
                                            {incident.summary}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Box>
                        );
                    })}
                </Stack>

                <Flex mt={4} align="center" justify="center">
                    <Text fontSize="xs" fontWeight="bold" color="blue.500">
                        詳細を表示
                    </Text>
                    <Icon as={HiChevronRight} color="blue.500" />
                </Flex>
            </Box>
        </Box>
    );
};