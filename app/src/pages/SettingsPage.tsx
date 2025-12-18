import {AdminLayout} from "@/components/layout/AdminLayout.tsx";
import {SettingsForm} from "@/features/admin/settings/SettingsForm.tsx";

export const SettingsPage = () => {

    return (
        <AdminLayout>
            <SettingsForm />
        </AdminLayout>
    );
};