import { OperationLogsTable } from "./components/operation/OperationLogsTable";
import { useOperationLogs } from "./hooks/useOperationLogs";

export const OperationLogsForm = () => {
    const {
        logs,
        pagination,
        loading,
        page,
        limit,
        setPage,
        setLimit,
        setSearch,
        setFilters
    } = useOperationLogs();

    return (
        <OperationLogsTable
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