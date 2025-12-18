import { useState } from "react";
import {Box, Flex, Table, Input, Button, HStack} from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel, PiArrowCounterClockwise, PiDownloadSimple } from "react-icons/pi";
import { Tooltip } from "@/components/ui/tooltip";
import { LogsPagination } from "@/features/admin/logs/components/LogsPagination";
import { AccessLogsFilterModal, type AccessLogFilterConditions } from "@/features/admin/logs/components/access/AccessLogsFilterModal";
import {ItemsPerPageSelect} from "@/features/admin/logs/components/ItemsPerPageSelect.tsx";

export type AccessLog = {
    id: string;
    datetime: string;
    user: string;
    ipAddress: string;
    destination: string;
};

type Props = {
    data: AccessLog[];
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    onSearch: (text: string) => void;
    onFilterApply: (filters: AccessLogFilterConditions) => void; // 追加
};

export const AccessLogsTable = ({
                                    data,
                                    totalItems,
                                    currentPage,
                                    itemsPerPage,
                                    onPageChange,
                                    onItemsPerPageChange,
                                    onSearch,
                                    onFilterApply,
                                }: Props) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<AccessLogFilterConditions>({
        startDate: "", endDate: "", ipAddress: "", destination: [],
    });

    const hasActiveFilters = !!(currentFilters.startDate || currentFilters.ipAddress || currentFilters.destination.length > 0);

    return (
        <Box>
            {/* --- ヘッダー：配置のバランスを微調整 --- */}
            <Flex
                mb={6}
                bg="white"
                p={4}
                borderRadius="xl"
                shadow="sm"
                align="center"
                justify="space-between"
                borderWidth="1px"
                borderColor="gray.100" // 境界線を薄く入れると締まります
            >
                <Flex align="center" gap={4}>
                    {/* 検索窓を少しだけスリムに（280px） */}
                    <Box position="relative" w="280px">
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                            <PiMagnifyingGlass color="#A0AEC0" />
                        </Box>
                        <Input
                            placeholder="キーワード検索..."
                            pl={10}
                            size="md"
                            variant="subtle" // 少しグレーがかった背景でモダンに
                            bg="#f8f9fa"
                            borderRadius="lg"
                            onChange={(e) => onSearch(e.target.value)}
                            _focus={{ bg: "white", borderColor: "blue.400" }}
                        />
                    </Box>

                    {/* 操作系：フィルターとリセットを隣接させる */}
                    <HStack gap={2}>
                        <Tooltip content="条件を絞り込む" showArrow>
                            <Button variant="outline" size="md" onClick={() => setIsFilterOpen(true)} borderRadius="lg">
                                <PiFunnel />
                            </Button>
                        </Tooltip>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" colorScheme="red" onClick={() => onFilterApply({startDate:"", endDate:"", ipAddress:"", destination:[]})}>
                                <PiArrowCounterClockwise />
                            </Button>
                        )}
                    </HStack>
                </Flex>

                {/* 右側：設定系とアクション系 */}
                <HStack gap={6}>
                    <ItemsPerPageSelect value={itemsPerPage} onChange={onItemsPerPageChange} />

                    <Box w="1px" h="20px" bg="gray.200" /> {/* セパレーターを入れると整理されます */}

                    <Tooltip content="CSV形式でダウンロード" showArrow positioning={{ placement: "bottom" }}>
                        <Button
                            aria-label="CSV出力"
                            variant="solid"
                            bg="orange.500"
                            color="white"
                            borderRadius="full"
                            boxShadow="md" // 少しだけ影をつけると浮き上がって見えます
                            minW="42px" h="42px"
                            _hover={{ bg: "orange.600"}}
                            _active={{ transform: "scale(0.92)" }}
                            transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
                        >
                            <PiDownloadSimple size={22} />
                        </Button>
                    </Tooltip>
                </HStack>
            </Flex>

            {/* --- テーブル：行の質感を向上 --- */}
            <Box bg="white" borderRadius="xl" shadow="sm" borderWidth="1px" borderColor="gray.200" overflow="hidden">
                <Table.Root size="md" interactive>
                    <Table.Header bg="gray.50">
                        <Table.Row>
                            <Table.ColumnHeader py={4} color="gray.600" fontWeight="bold">日時</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">ユーザー</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">IPアドレス</Table.ColumnHeader>
                            <Table.ColumnHeader color="gray.600" fontWeight="bold">アクセス先</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {data.map((log) => (
                            <Table.Row
                                key={log.id}
                                transition="background-color 0.1s" // ホバー時の色変化を滑らかに
                                _hover={{ bg: "blue.50/30" }} // ほんのり青みがかったホバー色
                            >
                                <Table.Cell fontSize="sm" color="gray.700">{log.datetime}</Table.Cell>
                                <Table.Cell fontSize="sm" fontWeight="semibold">{log.user}</Table.Cell>
                                <Table.Cell fontSize="sm" color="gray.500" fontFamily="mono">{log.ipAddress}</Table.Cell>
                                <Table.Cell fontSize="sm" color="gray.700">{log.destination}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>

                <Flex p={4} borderTopWidth="1px" borderColor="gray.100" bg="white">
                    <LogsPagination
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={totalItems}
                        onPageChange={onPageChange}
                    />
                </Flex>
            </Box>

            <AccessLogsFilterModal
                open={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={(f) => { setCurrentFilters(f); onFilterApply(f); }}
                initialFilters={currentFilters}
            />
        </Box>
    );
};