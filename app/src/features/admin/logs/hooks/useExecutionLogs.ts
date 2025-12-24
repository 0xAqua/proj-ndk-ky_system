import { useState, useEffect, useCallback } from 'react';
import { logsService } from '@/lib/service/logs';
import type { ExecutionLog, PaginationInfo } from '@/lib/service/logs';
import type { ExecutionLogFilterConditions } from '@/features/admin/logs/components/execution/ExecutionLogsFilterModal';

export const useExecutionLogs = () => {
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<ExecutionLogFilterConditions>({
        startDate: "", endDate: "", status: [], jobName: "",
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            // ★ page, limit に加えて search や filters も渡すようにします
            const response = await logsService.getExecutionLogs({
                page,
                limit,
                search, // 追加
                filters // 追加
            });
            setLogs(response.items);
            setPagination(response.pagination);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filters]); // ★ search と filters を依存配列に追加

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    return {
        logs,
        pagination,
        loading,
        page,
        limit,
        setPage,
        setLimit,
        setSearch,
        setFilters,
        refresh: fetchLogs // 手動更新用に一応返す
    };
};