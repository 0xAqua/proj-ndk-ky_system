import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { PasswordResetPage } from '@/pages/PasswordResetPage.tsx';
import { EntryPage } from "@/pages/EntryPage";
import { ResultPage } from "@/pages/ResultPage";
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { SamplePage } from "@/pages/SampletPage.tsx";
import { SettingsPage } from "@/pages/SettingsPage.tsx";
import { UserAdminPage } from "@/pages/UserAdminPage.tsx";
import { ResultListPage } from "@/pages/ResultListPage.tsx";
import { LogsPage } from "@/pages/LogsPage.tsx";
import {AdminLayout} from "@/components/layout/AdminLayout.tsx";
import {MainLayout} from "@/components/layout/MainLayout.tsx";
import {AuthLayout} from "@/components/layout/AuthLayout.tsx";

export const AppRoutes = () => {
    return (
        <Routes>
            {/* --- A. 認証不要 + AuthLayout 適用 --- */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<PasswordResetPage />} />

            </Route>

            {/* --- B. 一般ユーザー・管理者共通 + MainLayout 適用 --- */}
            <Route element={<AuthGuard><Outlet /></AuthGuard>}>
                <Route element={<MainLayout />}>
                    <Route path="/entry" element={<EntryPage />} />
                    <Route path="/result" element={<ResultPage />} />
                </Route>
            </Route>

            {/* --- C. 管理者専用 + AdminLayout 適用 --- */}
            <Route element={<AuthGuard allowedRoles={['admin']}><Outlet /></AuthGuard>}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin/sample" element={<SamplePage />} />
                    <Route path="/admin/advanced-settings" element={<SettingsPage />} />
                    <Route path="/admin/users" element={<UserAdminPage />} />
                    <Route path="/admin/results" element={<ResultListPage />} />
                    <Route path="/admin/logs" element={<LogsPage />} />
                </Route>
            </Route>

            {/* その他 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};