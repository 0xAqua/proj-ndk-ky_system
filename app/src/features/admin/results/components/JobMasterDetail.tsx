import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { VQJobListItem } from "../hooks/useVQJobs";
import { JobRow } from "./JobRow";
import { JobDetailPane } from "./JobDetailPane";

type Props = {
    jobs: VQJobListItem[];
    isLoading?: boolean;
};

export const JobMasterDetail = ({ jobs, isLoading = false }: Props) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    return (
        <Flex gap={4} align="stretch" direction={{ base: "column", md: "row" }} w="full">
            {/* Left: list */}
            <Box
                w={{ base: "full", md: "420px" }}
                flexShrink={0}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
            >
                <Box px={4} py={3} borderBottom="1px solid" borderColor="gray.100">
                    <Heading size="sm">ジョブ一覧</Heading>
                    <Text fontSize="xs" color="gray.500">
                        {isLoading ? "読み込み中..." : `${jobs.length} 件`}
                    </Text>
                </Box>

                <Box maxH={{ base: "auto", md: "calc(100vh - 200px)" }} overflow="auto">
                    {jobs.map((job) => (
                        <JobRow
                            key={job.job_id}
                            job={job}
                            isSelected={job.job_id === selectedJobId}
                            onClick={(id) => setSelectedJobId(id)}
                        />
                    ))}

                    {!isLoading && jobs.length === 0 && (
                        <Box p={4}>
                            <Text fontSize="sm" color="gray.500">
                                ジョブがありません
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Right: detail */}
            <Box
                flex="1"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                bg="white"
                overflow="hidden"
            >
                {/* ✅ job ではなく jobId を渡す */}
                <JobDetailPane jobId={selectedJobId} />
            </Box>
        </Flex>
    );
};
