import { Table, Badge, Text } from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { summarizeList } from "@/features/admin/logs/utils/logUtils";
import { ExecutionLogSkeleton } from "./ExecutionLogSkeleton";
import type { ExecutionLog } from "@/lib/service/logsService.ts";
import {renderTooltipList} from "@/features/admin/logs/components/elements/renderTooltipList.tsx";

type Props = {
    data: ExecutionLog[];
    loading: boolean;
    rowsPerPage: number;
};

export const ExecutionLogBody = ({ data, loading, rowsPerPage }: Props) => {
    if (loading) return <ExecutionLogSkeleton rows={rowsPerPage} />;

    if (data.length === 0) {
        return (
            <Table.Row>
                <Table.Cell colSpan={6} textAlign="center" py={10} color="gray.500">
                    該当するログが見つかりませんでした
                </Table.Cell>
            </Table.Row>
        );
    }

    return (
        <>
            {data.map((log) => {
                const typeSum = summarizeList(log.typeNames);
                const processSum = summarizeList(log.processNames);

                return (
                    <Table.Row key={log.jobId} transition="background-color 0.1s" _hover={{ bg: "blue.50/30" }}>
                        <Table.Cell fontSize="xs" color="gray.700" whiteSpace="nowrap">{log.createdAt}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.600" maxW="150px" truncate>{log.email}</Table.Cell>

                        <Table.Cell>
                            <Tooltip
                                content={renderTooltipList(log.typeNames ?? [])}
                                showArrow
                                portalled
                                disabled={typeSum.restCount === 0}
                                openDelay={0}
                                positioning={{ placement: "right" }}
                            >
                                <Text fontSize="sm" cursor={typeSum.restCount > 0 ? "help" : "default"}>
                                    {typeSum.primary}
                                    {typeSum.restCount > 0 && <Text as="span" color="blue.500" ml={1} fontWeight="bold">+{typeSum.restCount}</Text>}
                                </Text>
                            </Tooltip>
                        </Table.Cell>

                        <Table.Cell>
                            <Tooltip
                                content={renderTooltipList(log.processNames ?? [])}
                                showArrow
                                portalled
                                disabled={processSum.restCount === 0}
                                openDelay={0}
                                positioning={{ placement: "right" }}

                            >
                                <Text fontSize="sm" cursor={processSum.restCount > 0 ? "help" : "default"} maxW="200px">
                                    {processSum.primary}
                                    {processSum.restCount > 0 && <Text as="span" color="blue.500" ml={1} fontWeight="bold">+{processSum.restCount}</Text>}
                                </Text>
                            </Tooltip>
                        </Table.Cell>

                        <Table.Cell>
                            <Badge colorPalette={log.status === 'COMPLETED' ? 'green' : log.status === 'PROCESSING' ? 'orange' : 'red'} variant="subtle">
                                {log.status === 'COMPLETED' ? '完了' : log.status === 'PROCESSING' ? '実行中' : 'エラー'}
                            </Badge>
                        </Table.Cell>

                        <Table.Cell fontSize="xs" color="gray.500" fontFamily="mono" textAlign="right">
                            {log.durationSec} 秒
                        </Table.Cell>
                    </Table.Row>
                );
            })}
        </>
    );
};