// src/components/result/ResultForm.tsx
import { useMemo, useState } from "react";
import { Badge, Box, Stack, Text, VStack } from "@chakra-ui/react";
import type { JobStatus } from "@/features/result/hooks/useJobResult";
import {
    normalizeIncidents,
    type IncidentData,
    type RawIncident,
} from "@/features/result/utils/normalizeIncidents";
import { IncidentCard } from "@/features/result/components/elements/IncidentCard";

type Props = {
    jobId: string;
    status: JobStatus;
    result: RawIncident[]; // ← ここをちゃんと型付けできるのが理想
};

export const ResultForm = ({ jobId, status, result }: Props) => {
    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    const incidents: IncidentData[] = useMemo(
        () => normalizeIncidents(result ?? []),
        [result],
    );

    const handleCaseClick = (caseId: string) => {
        setSelectedCases((prev) =>
            prev.includes(caseId)
                ? prev.filter((id) => id !== caseId)
                : [...prev, caseId],
        );
    };

    if (!incidents.length) {
        return (
            <Box w="full">
                <Box mb={4}>
                    <Text fontSize="xs" color="gray.500">
                        Job ID: {jobId}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        Status: {status}
                    </Text>
                </Box>

                <Box
                    as="pre"
                    p={4}
                    bg="gray.100"
                    borderRadius="md"
                    overflow="auto"
                    fontSize="sm"
                    whiteSpace="pre-wrap"
                >
                    {JSON.stringify(result, null, 2)}
                </Box>
            </Box>
        );
    }

    return (
        <VStack m="auto" maxW="sm" gap={4} px={2} w="full">
            <Box w="full">
                <Text fontSize="xs" color="gray.500">
                    Job ID: {jobId}
                </Text>
                <Badge
                    mt={1}
                    size="sm"
                    colorPalette={status === "COMPLETED" ? "green" : "orange"}
                >
                    {status === "COMPLETED" ? "解析完了" : `ステータス: ${status}`}
                </Badge>
            </Box>

            <Box w="full">
                <Stack gap={4}>
                    {incidents.map((incident) => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            isOpen={selectedCases.includes(incident.id)}
                            onToggle={() => handleCaseClick(incident.id)}
                        />
                    ))}
                </Stack>
            </Box>
        </VStack>
    );
};
