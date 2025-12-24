import { ExecutionLogsTable } from "./components/execution/ExecutionLogsTable";
import { useExecutionLogs } from "./hooks/useExecutionLogs";

export const ExecutionLogsFrom = () => {
    const {
        logs,
        pagination,
        loading, // フックから取得
        page,
        limit,
        setPage,
        setLimit,
        setSearch,
        setFilters
    } = useExecutionLogs();

    // 全体 Spinner は削除し、常にテーブルを表示する
    return (
        <ExecutionLogsTable
            data={logs}
            loading={loading}
            totalItems={pagination?.totalItems || 0}
            currentPage={page}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
            onSearch={setSearch}
            onFilterApply={setFilters}
        />
    );
};