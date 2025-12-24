import { useState } from "react";
import { Box, Flex, Table, Input, Button, HStack, Badge } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel, PiArrowCounterClockwise, PiDownloadSimple } from "react-icons/pi";
import { Tooltip } from "@/components/ui/tooltip";
import { LogsPagination } from "@/features/admin/logs/components/elements/LogsPagination.tsx";
import { OperationLogsFilterModal, type OperationLogFilterConditions } from "@/features/admin/logs/components/operation/OperationLogsFilterModal";
import { ItemsPerPageSelect } from "@/features/admin/logs/components/elements/ItemsPerPageSelect.tsx";

export type OperationLog = {
    id: string;
    datetime: string;
    user: string;
    target: string;
    action: string;
    status: 'success' | 'failure';
};

type Props = {
    data: OperationLog[];
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    onSearch: (text: string) => void;
    onFilterApply: (filters: OperationLogFilterConditions) => void;
};

export const OperationLogsTable = ({
                                       data, totalItems, currentPage, itemsPerPage,
                                       onPageChange, onItemsPerPageChange, onSearch, onFilterApply,
                                   }: Props) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<OperationLogFilterConditions>({
        actions: [], status: [], user: [],
    });

    const hasActiveFilters = currentFilters.actions.length > 0 || currentFilters.status.length > 0;

    return (
        <Box>
            {/* --- ヘッダー：AccessLogsTable と完全同期 --- */}
            <Flex
                mb={6} bg="white" p={4} borderRadius="xl" shadow="sm" align="center" justify="space-between"
                borderWidth="1px" borderColor="gray.100"
            >
                <Flex align="center" gap={4}>
                    <Box position="relative" w="280px">
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                            <PiMagnifyingGlass color="#A0AEC0" />
                        </Box>
                        <Input
                            placeholder="ユーザー名や対象で検索..."
                            pl={10} size="md" variant="subtle" bg="#f8f9fa" borderRadius="lg"
                            onChange={(e) => onSearch(e.target.value)}
                            _focus={{ bg: "white", borderColor: "blue.400" }}
                        />
                    </Box>

                    <HStack gap={2}>
                        <Tooltip content="条件を絞り込む" showArrow>
                            <Button variant="outline" size="md" onClick={() => setIsFilterOpen(true)} borderRadius="lg">
                                <PiFunnel />
                            </Button>
                        </Tooltip>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" colorScheme="red" onClick={() => onFilterApply({actions:[], status:[], user:[]})}>
                                <PiArrowCounterClockwise />
                            </Button>
                        )}
                    </HStack>
                </Flex>

                <HStack gap={6}>
                    <ItemsPerPageSelect value={itemsPerPage} onChange={onItemsPerPageChange} />
                    <Box w="1px" h="20px" bg="gray.200" />

                    {/* openDelay={0} を追加してツールチップを即時表示 */}
                    <Tooltip
                        content="CSV形式でダウンロード"
                        showArrow
                        positioning={{ placement: "bottom" }}
                        openDelay={0}
                    >
                        <Button
                            aria-label="CSV出力"
                            variant="solid"
                            bg="orange.500"
                            color="white"
                            borderRadius="full" // カプセル形状を維持
                            shadow="md"
                            minW="42px" // 横幅の最小値を維持
                            h="42px"
                            _hover={{ bg: "orange.600" }}
                            _active={{ transform: "scale(0.92)" }}
                            transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
                        >
                            <PiDownloadSimple size={22} />
                        </Button>
                    </Tooltip>
                </HStack>
            </Flex>

            {/* --- テーブル本体：行の質感を同期 --- */}
            <Box bg="white" borderRadius="xl" shadow="sm" borderWidth="1px" borderColor="gray.200" overflow="hidden">
                <Table.Root size="md" interactive>
                    <Table.Header bg="gray.50">
                        <Table.Row>
                            <Table.ColumnHeader py={4} color="gray.600" fontWeight="bold">日時</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">ユーザー</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">対象</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">操作内容</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">結果</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {data.map((log) => (
                            <Table.Row
                                key={log.id}
                                transition="background-color 0.1s"
                                _hover={{ bg: "blue.50/30" }}
                            >
                                <Table.Cell fontSize="sm" color="gray.700">{log.datetime}</Table.Cell>
                                <Table.Cell fontSize="sm" fontWeight="semibold">{log.user}</Table.Cell>
                                <Table.Cell fontSize="sm" color="gray.700">{log.target}</Table.Cell>
                                <Table.Cell fontSize="sm" color="gray.700">{log.action}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={log.status === 'success' ? 'green' : 'red'} variant="solid" px={2}>
                                        {log.status === 'success' ? '成功' : '失敗'}
                                    </Badge>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                <Flex p={4} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <LogsPagination currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={totalItems} onPageChange={onPageChange} />
                </Flex>
            </Box>

            <OperationLogsFilterModal
                open={isFilterOpen} onClose={() => setIsFilterOpen(false)}
                onApply={(f) => { setCurrentFilters(f); onFilterApply(f); }} initialFilters={currentFilters}
            />
        </Box>
    );
};