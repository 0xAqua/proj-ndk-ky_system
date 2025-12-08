import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserAdminForm } from "@/features/admin/users/UserAdminForm";

export const UserAdminPage = () => {
    return (
        <AdminLayout>
            <UserAdminForm />
        </AdminLayout>
    );
};