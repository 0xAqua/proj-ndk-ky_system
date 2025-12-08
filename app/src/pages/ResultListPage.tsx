import { AdminLayout } from "@/components/layout/AdminLayout";
import {ResultListForm} from "@/features/admin/result/ResultListForm";

export const ResultListPage = () => {
    return (
        <AdminLayout>
            <ResultListForm />
        </AdminLayout>
    );
};