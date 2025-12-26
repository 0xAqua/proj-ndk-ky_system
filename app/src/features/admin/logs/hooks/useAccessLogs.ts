import { useState, useEffect, useCallback } from "react";
import { logsService, type AccessLog, type PaginationInfo } from "@/lib/service/logs";
import type { AccessLogFilterConditions } from "../components/access/AccessLogsFilterModal";

export const useAccessLogs = () => {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<AccessLogFilterConditions>({
        startDate: "",
        endDate: "",
        ipAddress: "",
        destination: [],
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await logsService.getAccessLogs({
                page,
                limit,
                search,
                filters,
            });
            setLogs(res.items);
            setPagination(res.pagination);
        } catch (err) {
            console.error("Failed to fetch access logs:", err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSetLimit = (newLimit: number) => {
        setPage(1);
        setLimit(newLimit);
    };

    const handleSetSearch = (text: string) => {
        setPage(1);
        setSearch(text);
    };

    const handleSetFilters = (newFilters: AccessLogFilterConditions) => {
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