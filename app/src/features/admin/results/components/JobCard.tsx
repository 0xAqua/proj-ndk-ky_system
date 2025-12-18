import { Box, Center, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { HiSparkles } from "react-icons/hi";
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
            position="relative"
            bg="linear-gradient(135deg, #fdfcfb 0%, #f7f5f2 100%)"
            borderRadius="2xl"
            overflow="hidden"
            cursor="pointer"
            onClick={handleClick}
            transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            boxShadow="0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)"
            _hover={{
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)",
            }}
            _before={{
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                bgGradient: "linear(to-r, #d4af37, #f9d423, #d4af37)",
                opacity: 0.8,
            }}
        >
            {/* ヘッダー部分 */}
            <Flex
                py={4}
                px={5}
                align="center"
                justify="space-between"
                borderBottomWidth="1px"
                borderBottomColor="rgba(0, 0, 0, 0.05)"
            >
                <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="gray.700"
                >
                    {formatDate(job.created_at)}
                </Text>

                <Text
                    fontSize="xs"
                    fontWeight="500"
                    color="gray.500"
                >
                    {incidents.length}件
                </Text>
            </Flex>

            {/* インシデント一覧 */}
            <Box px={5} py={4}>
                <Stack gap={3}>
                    {incidents.map((incident) => {
                        const isPast = incident.classification === "過去に起きたインシデント";
                        const themeColor = isPast ? "orange" : "pink";
                        const StatusIcon = isPast ? MdWarning : HiSparkles;
                        const truncatedSummary = incident.summary.length > 40
                            ? `${incident.summary.slice(0, 40)}...`
                            : incident.summary;

                        return (
                            <Stack key={incident.id} gap={1}>
                                <Flex gap={2.5} align="flex-start">
                                    <Center
                                        boxSize="22px"
                                        bg={`${themeColor}.100`}
                                        borderRadius="md"
                                        flexShrink={0}
                                    >
                                        <Icon as={StatusIcon} boxSize={3.5} color={`${themeColor}.600`} />
                                    </Center>
                                    <Text
                                        fontSize="sm"
                                        color="gray.800"
                                        lineHeight="1.5"
                                        fontWeight="500"
                                        flex={1}
                                    >
                                        {incident.title}
                                    </Text>
                                </Flex>
                                <Box pl="30px">
                                    <Text
                                        fontSize="xs"
                                        color="gray.500"
                                        lineHeight="1.5"
                                    >
                                        {truncatedSummary}
                                    </Text>
                                </Box>
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>
        </Box>
    );
};