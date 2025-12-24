import { Box, Flex} from "@chakra-ui/react";
import { useState } from "react";
import type { VQJobListItem } from "../hooks/useVQJobs";
import { JobRow } from "./JobRow";
import { JobDetailPane } from "./JobDetailPane";

type Props = {
    jobs: VQJobListItem[];
};

export const JobMasterDetail = ({ jobs }: Props) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    return (
        <Flex
            gap={4}
            direction={{ base: "column", md: "row" }}
            w="full"
            maxH={{ base: "auto", md: "100vh" }}
            overflow="hidden"
            align="start"
        >
            {/* Left: スクロール可能なリスト */}
            <Box
                // 選択されていない時は横幅をフルにする、などの調整も可能です
                w={{ base: "full", md: selectedJobId ? "420px" : "full" }}
                transition="width 0.2s" // スムーズに動かしたい場合
                flexShrink={0}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                bg="white"
                overflow="hidden"
                maxH={{ base: "auto", md: "100vh" }}
            >
                <Box overflowY="auto" maxH="inherit">
                    {jobs.map((job) => (
                        <JobRow
                            key={job.job_id}
                            job={job}
                            isSelected={job.job_id === selectedJobId}
                            onClick={(id) => setSelectedJobId(id)}
                        />
                    ))}
                    {/* ... (jobs.length === 0 の処理) */}
                </Box>
            </Box>

            {/* Right: 詳細ペイン (selectedJobId がある時だけ表示) */}
            {selectedJobId && (
                <Box
                    flex="1"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    bg="white"
                    overflow="hidden"
                    // アニメーションなどを入れるとよりスムーズです
                >
                    <JobDetailPane
                        jobId={selectedJobId}
                        // 必要であれば「閉じる」ボタン用に渡す
                        // onClose={() => setSelectedJobId(null)}
                    />
                </Box>
            )}
        </Flex>
    );
};