import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { EntryPage } from "@/pages/EntryPage";
import { ResultPage } from "@/pages/ResultPage";
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import { SamplePage } from "@/pages/SampletPage.tsx";
import { SettingsPage } from "@/pages/SettingsPage.tsx";
import { UserAdminPage } from "@/pages/UserAdminPage.tsx";
import { ResultListPage } from "@/pages/ResultListPage.tsx";
import { LogsPage } from "@/pages/LogsPage.tsx";

export const AppRoutes = () => {
    return (
        <Routes>
            {/* 1. 公開ルート: ガードなし */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 2. 一般ユーザー・管理者 共通の保護ルート */}
            <Route element={<AuthGuard><Outlet /></AuthGuard>}>
                <Route path="/entry" element={<EntryPage />} />
                <Route path="/result" element={<ResultPage />} />
            </Route>

            {/* 3. 管理者(admin)専用の保護ルート */}
            <Route element={<AuthGuard allowedRoles={['admin']}><Outlet /></AuthGuard>}>
                <Route path="/admin/sample" element={<SamplePage />} />
                <Route path="/admin/advanced-settings" element={<SettingsPage />} />
                <Route path="/admin/users" element={<UserAdminPage />} />
                <Route path="/admin/results" element={<ResultListPage />} />
                <Route path="/admin/logs" element={<LogsPage />} />
            </Route>

            {/* 4. 404対策 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};