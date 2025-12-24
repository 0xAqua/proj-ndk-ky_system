import { useState } from "react";
import { Box, Flex, Table, Input, Button, HStack } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel, PiArrowCounterClockwise, PiDownloadSimple } from "react-icons/pi";
import { Tooltip } from "@/components/ui/tooltip";
import { LogsPagination } from "../elements/LogsPagination.tsx";
import { ItemsPerPageSelect } from "../elements/ItemsPerPageSelect.tsx";
import { ExecutionLogsFilterModal, type ExecutionLogFilterConditions } from "./ExecutionLogsFilterModal";
import { ExecutionLogBody } from "@/features/admin/logs/components/execution/ExecutionLogBody";
import type { ExecutionLog } from "@/lib/service/logs";

type Props = {
    data: ExecutionLog[];
    loading: boolean;
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    onSearch: (text: string) => void;
    onFilterApply: (filters: ExecutionLogFilterConditions) => void;
};

export const ExecutionLogsTable = ({
                                       data, loading, totalItems, currentPage, itemsPerPage,
                                       onPageChange, onItemsPerPageChange, onSearch, onFilterApply,
                                   }: Props) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<ExecutionLogFilterConditions>({
        startDate: "", endDate: "", status: [], jobName: "",
    });

    const hasActiveFilters = !!(currentFilters.startDate || currentFilters.status.length > 0 || currentFilters.jobName);

    return (
        <Box>
            {/* ヘッダーセクション */}
            <Flex mb={6} bg="white" p={4} borderRadius="xl" shadow="sm" align="center" justify="space-between" borderWidth="1px" borderColor="gray.100">
                <HStack gap={4}>
                    <Box position="relative" w="280px">
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                            <PiMagnifyingGlass color="#A0AEC0" />
                        </Box>
                        <Input
                            placeholder="メールアドレスで検索..."
                            pl={10} size="md" variant="subtle" bg="#f8f9fa" borderRadius="lg"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </Box>
                    <Tooltip content="条件を絞り込む" showArrow>
                        <Button variant="outline" size="md" onClick={() => setIsFilterOpen(true)} borderRadius="lg">
                            <PiFunnel />
                        </Button>
                    </Tooltip>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={() => onFilterApply({startDate:"", endDate:"", status:[], jobName:""})}>
                            <PiArrowCounterClockwise />
                        </Button>
                    )}
                </HStack>

                <HStack gap={6}>
                    <ItemsPerPageSelect value={itemsPerPage} onChange={onItemsPerPageChange} />
                    <Box w="1px" h="20px" bg="gray.200" />
                    <Button variant="solid" bg="orange.500" color="white" borderRadius="full" shadow="md">
                        <PiDownloadSimple size={22} />
                    </Button>
                </HStack>
            </Flex>

            {/* テーブルセクション */}
            <Box bg="white" borderRadius="xl" shadow="sm" borderWidth="1px" borderColor="gray.200" overflow="hidden">
                {/* ↓ スクロール領域をここで作る */}
                <Box maxH="500px" overflowY="auto">
                    <Table.Root size="md" interactive>
                        <Table.Header
                            bg="gray.50"
                            position="sticky"
                            top={0}
                            zIndex={1}
                        >
                            <Table.Row>
                                <Table.ColumnHeader py={4} color="gray.600" fontWeight="bold">開始日時</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">ユーザー</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">工事種別</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">工事工程</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">ステータス</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold" textAlign="right">処理時間</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            <ExecutionLogBody data={data} loading={loading} rowsPerPage={itemsPerPage} />
                        </Table.Body>
                    </Table.Root>
                </Box>

                {/* ページネーションは外側なので自動的に固定される */}
                <Flex p={4} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <LogsPagination currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={totalItems} onPageChange={onPageChange} />
                </Flex>
            </Box>

            <ExecutionLogsFilterModal
                open={isFilterOpen} onClose={() => setIsFilterOpen(false)}
                onApply={(f) => { setCurrentFilters(f); onFilterApply(f); }}
                initialFilters={currentFilters}
            />
        </Box>
    );
};