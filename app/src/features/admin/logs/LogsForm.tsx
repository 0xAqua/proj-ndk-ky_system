import { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { LogsSidebar } from '@/features/admin/logs/components/elements/LogsSidebar.tsx';
import { AccessLogsTable } from '@/features/admin/logs/components/access/AccessLogsTable';
import { OperationLogsTable } from '@/features/admin/logs/components/operation/OperationLogsTable';
import { ExecutionLogsFrom } from '@/features/admin/logs/ExecutionLogsForm';

import type {AccessLogFilterConditions} from '@/features/admin/logs/components/access/AccessLogsFilterModal';
import type { OperationLogFilterConditions } from '@/features/admin/logs/components/operation/OperationLogsFilterModal';

type LogType = 'access' | 'operation' | 'execution';

export const LogsForm = () => {
    // 基本的な表示状態
    const [selectedLog, setSelectedLog] = useState<LogType>('access');
    const [itemsPerPage, setItemsPerPage] = useState<number>(30);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // --- 各ログの検索・フィルター実行時のハンドラー ---
    // 実際の実装ではここで API へのフェッチ処理などを行います
    const handleSearch = (text: string) => {
        console.log(`${selectedLog} search:`, text);
        setCurrentPage(1); // 検索時は1ページ目に戻す
    };

    const handleFilterApply = (filters: any) => {
        console.log(`${selectedLog} filters applied:`, filters);
        setCurrentPage(1);
    };

    // --- ページネーション・切り替えハンドラー ---
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    const handleLogTypeChange = (logType: LogType) => {
        setSelectedLog(logType);
        setCurrentPage(1); // ログ種別変更時はページをリセット
    };

    return (
        <Flex h="100%"> {/* 全体の背景色を少し調整して統一感を出す */}
            <LogsSidebar
                selectedLog={selectedLog}
                onSelectLog={handleLogTypeChange}
            />

            <Box flex={1} p={8} overflowY="auto">
                {/* アクセス履歴 */}
                {selectedLog === 'access' && (
                    <AccessLogsTable
                        data={[]} // ここに取得したデータを渡す
                        totalItems={0}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onSearch={handleSearch}
                        onFilterApply={(f: AccessLogFilterConditions) => handleFilterApply(f)}
                    />
                )}

                {/* 操作履歴 */}
                {selectedLog === 'operation' && (
                    <OperationLogsTable
                        data={[]}
                        totalItems={0}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onSearch={handleSearch}
                        onFilterApply={(f: OperationLogFilterConditions) => handleFilterApply(f)}
                    />
                )}

                {/* 実行履歴 */}
                {selectedLog === 'execution' && (
                    <ExecutionLogsFrom />
                )}
            </Box>
        </Flex>
    );
};