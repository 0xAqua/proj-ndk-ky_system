import { Box, Flex, Icon, Stack, Text, Badge } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { HiSparkles, HiChevronRight, HiOutlineClock } from "react-icons/hi";
import { MdWarning } from "react-icons/md";
import { formatDate } from "../utils/formatDate";
import type { VQJob } from "../hooks/useVQJobs";

interface JobCardProps {
    job: VQJob;
}

export const JobCard = ({ job }: JobCardProps) => {
    const navigate = useNavigate();
    const incidents = job.incidents || [];

    // データを分類
    const factIncidents = incidents.filter(i => i.classification === "過去に起きたインシデント");
    const aiIncidents = incidents.filter(i => i.classification !== "過去に起きたインシデント");

    const handleClick = () => {
        navigate("/result", { state: { jobId: job.job_id } });
    };

    return (
        <Box
            as="article"
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            cursor="pointer"
            onClick={handleClick}
            overflow="hidden"
            transition="all 0.2s"
            _hover={{
                borderColor: "blue.400",
                boxShadow: "lg",
                transform: "translateY(-2px)"
            }}
        >
            {/* ヘッダーエリア */}
            <Flex
                bg="gray.50"
                px={5}
                py={3}
                justify="space-between"
                align="center"
                borderBottom="1px solid"
                borderColor="gray.100"
            >
                <Flex align="center" gap={2} color="gray.500">
                    <Icon as={HiOutlineClock} />
                    <Text fontSize="xs" fontWeight="bold">
                        {formatDate(job.created_at)}
                    </Text>
                </Flex>
                <Icon as={HiChevronRight} color="gray.400" />
            </Flex>

            {/* メインコンテンツ */}
            <Box p={5}>
                {/* 統計バッジエリア */}
                <Flex gap={3} mb={5}>
                    <Badge
                        colorPalette="orange"
                        variant="surface"
                        px={2.5} py={1}
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        gap={1.5}
                    >
                        <Icon as={MdWarning} />
                        過去事例: {factIncidents.length}件
                    </Badge>
                    <Badge
                        colorPalette="purple"
                        variant="surface"
                        px={2.5} py={1}
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        gap={1.5}
                    >
                        <Icon as={HiSparkles} />
                        AI予測: {aiIncidents.length}件
                    </Badge>
                </Flex>

                {/* プレビューリスト（各カテゴリから最大1件ずつ表示など） */}
                <Stack gap={1.5}>
                    {factIncidents.length > 0 && (
                        <Box
                            bg="orange.50"
                            px={3}
                            py={1.5}
                            borderRadius="md"
                        >
                            <Text fontSize="sm" color="gray.800" lineClamp={1}>
                                {factIncidents[0].title}
                            </Text>
                        </Box>
                    )}

                    {aiIncidents.length > 0 && (
                        <Box
                            bg="purple.50"
                            px={3}
                            py={1.5}
                            borderRadius="md"
                        >
                            <Text fontSize="sm" color="gray.800" lineClamp={1}>
                                {aiIncidents[0].title}
                            </Text>
                        </Box>
                    )}
                </Stack>


                {(factIncidents.length > 1 || aiIncidents.length > 1) && (
                    <Text fontSize="xs" color="gray.400" mt={4} textAlign="center">
                        他 {incidents.length - Math.min(incidents.length, 2)} 件のインシデント...
                    </Text>
                )}
            </Box>
        </Box>
    );
};
