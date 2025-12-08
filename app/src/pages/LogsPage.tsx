import { AdminLayout } from "@/components/layout/AdminLayout";
import {LogsForm} from "@/features/admin/logs/LogsForm";

export const LogsPage = () => {
    return (
        <AdminLayout>
            <LogsForm />
        </AdminLayout>
    );
};