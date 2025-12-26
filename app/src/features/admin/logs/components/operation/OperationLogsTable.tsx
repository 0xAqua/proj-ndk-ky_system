import { useState } from "react";
import { Box, Flex, Table, Input, Button, HStack } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel, PiArrowCounterClockwise, PiDownloadSimple } from "react-icons/pi";
import { Tooltip } from "@/components/ui/tooltip";
import { LogsPagination } from "../elements/LogsPagination";
import { ItemsPerPageSelect } from "../elements/ItemsPerPageSelect";
import { OperationLogsFilterModal, type OperationLogFilterConditions } from "./OperationLogsFilterModal";
import { OperationLogBody } from "./OperationLogBody";
import type { OperationLog } from "@/lib/service/logsService";

type Props = {
    data: OperationLog[];
    loading: boolean;
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    onSearch: (text: string) => void;
    onFilterApply: (filters: OperationLogFilterConditions) => void;
};

export const OperationLogsTable = ({
                                       data, loading, totalItems, currentPage, itemsPerPage,
                                       onPageChange, onItemsPerPageChange, onSearch, onFilterApply,
                                   }: Props) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<OperationLogFilterConditions>({
        startDate: "", endDate: "", category: [], action: [],
    });

    const hasActiveFilters = !!(currentFilters.startDate || currentFilters.category.length > 0 || currentFilters.action.length > 0);

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
                            placeholder="メールアドレス・内容で検索..."
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
                        <Button variant="ghost" size="sm" onClick={() => {
                            setCurrentFilters({ startDate: "", endDate: "", category: [], action: [] });
                            onFilterApply({ startDate: "", endDate: "", category: [], action: [] });
                        }}>
                            <PiArrowCounterClockwise />
                        </Button>
                    )}
                </HStack>

                <HStack gap={6}>
                    <ItemsPerPageSelect value={itemsPerPage} onChange={onItemsPerPageChange} />
                    <Box w="1px" h="20px" bg="gray.200" />
                    <Tooltip content="CSV形式でダウンロード" showArrow positioning={{ placement: "bottom" }}>
                        <Button variant="solid" bg="orange.500" color="white" borderRadius="full" shadow="md" minW="42px" h="42px">
                            <PiDownloadSimple size={22} />
                        </Button>
                    </Tooltip>
                </HStack>
            </Flex>

            {/* テーブルセクション */}
            <Box bg="white" borderRadius="xl" shadow="sm" borderWidth="1px" borderColor="gray.200" overflow="hidden">
                <Box maxH="500px" overflowY="auto">
                    <Table.Root size="md" interactive>
                        <Table.Header bg="gray.50" position="sticky" top={0} zIndex={1}>
                            <Table.Row>
                                <Table.ColumnHeader py={4} color="gray.600" fontWeight="bold">日時</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">操作者</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">カテゴリ</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">操作</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">内容</Table.ColumnHeader>
                                <Table.ColumnHeader color="gray.600" fontWeight="bold">IPアドレス</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            <OperationLogBody data={data} loading={loading} rowsPerPage={itemsPerPage} />
                        </Table.Body>
                    </Table.Root>
                </Box>

                <Flex p={4} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <LogsPagination currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={totalItems} onPageChange={onPageChange} />
                </Flex>
            </Box>

            <OperationLogsFilterModal
                open={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={(f) => { setCurrentFilters(f); onFilterApply(f); }}
                initialFilters={currentFilters}
            />
        </Box>
    );
};