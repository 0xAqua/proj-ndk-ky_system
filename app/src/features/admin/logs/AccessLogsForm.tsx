import { AccessLogsTable } from "./components/access/AccessLogsTable";
import { useAccessLogs } from "./hooks/useAccessLogs";

export const AccessLogsForm = () => {
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
    } = useAccessLogs();

    return (
        <AccessLogsTable
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