import { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { LogsSidebar } from '@/features/admin/logs/components/elements/LogsSidebar.tsx';
import { ExecutionLogsFrom } from '@/features/admin/logs/ExecutionLogsForm';

import {AccessLogsForm} from "@/features/admin/logs/AccessLogsForm.tsx";
import {OperationLogsForm} from "@/features/admin/logs/OperationLogsForm.tsx";

type LogType = 'access' | 'operation' | 'execution';

export const LogsForm = () => {
    // 基本的な表示状態
    const [selectedLog, setSelectedLog] = useState<LogType>('access');


    const handleLogTypeChange = (logType: LogType) => {
        setSelectedLog(logType);
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
                    <AccessLogsForm />
                )}

                {/* 操作履歴 */}
                {selectedLog === 'operation' && (
                    <OperationLogsForm />
                )}

                {/* 実行履歴 */}
                {selectedLog === 'execution' && (
                    <ExecutionLogsFrom />
                )}
            </Box>
        </Flex>
    );
};