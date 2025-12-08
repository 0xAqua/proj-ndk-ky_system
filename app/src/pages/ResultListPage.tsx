import { AdminLayout } from "@/components/layout/AdminLayout";
import {ResultListForm} from "@/features/admin/results/ResultListForm.tsx";

export const ResultListPage = () => {
    return (
        <AdminLayout>
            <ResultListForm />
        </AdminLayout>
    );
};