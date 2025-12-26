import { useState, useEffect, useCallback } from "react";
import { logsService, type OperationLog, type PaginationInfo } from "@/lib/service/logsService";
import type { OperationLogFilterConditions } from "../components/operation/OperationLogsFilterModal";

export const useOperationLogs = () => {
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<OperationLogFilterConditions>({
        startDate: "",
        endDate: "",
        category: [],
        action: [],
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await logsService.getOperationLogs({
                page,
                limit,
                search,
                filters,
            });
            setLogs(res.items);
            setPagination(res.pagination);
        } catch (err) {
            console.error("Failed to fetch operation logs:", err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filters]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const handleSetLimit = (newLimit: number) => {
        setPage(1);
        setLimit(newLimit);
    };

    const handleSetSearch = (text: string) => {
        setPage(1);
        setSearch(text);
    };

    const handleSetFilters = (newFilters: OperationLogFilterConditions) => {
        setPage(1);
        setFilters(newFilters);
    };

    return {
        logs,
        pagination,
        loading,
        page,
        limit,
        setPage,
        setLimit: handleSetLimit,
        setSearch: handleSetSearch,
        setFilters: handleSetFilters,
    };
};