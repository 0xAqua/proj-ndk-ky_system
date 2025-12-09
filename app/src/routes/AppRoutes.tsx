import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { EntryPage } from "@/pages/EntryPage";
import { ResultPage } from "@/pages/ResultPage";
import { AuthGuard } from '@/features/auth/components/AuthGuard';
import {SamplePage} from "@/pages/SampletPage.tsx";
import {SettingsPage} from "@/pages/SettingsPage.tsx";
import {UserAdminPage} from "@/pages/UserAdminPage.tsx";
import {ResultListPage} from "@/pages/ResultListPage.tsx";
import {LogsPage} from "@/pages/LogsPage.tsx";

export const AppRoutes = () => {
    return (
        <Routes>
            {/* デフォルトルートはログイン画面へリダイレクト */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 公開ページ（ログイン画面） */}
            <Route path="/login" element={<LoginPage />} />

            {/* 保護されたページ（ログイン必須） */}
            <Route
                path="/entry"
                element={
                    <AuthGuard>
                        <EntryPage />
                    </AuthGuard>
                }
            />

            {/* 結果表示画面 (URLパラメータ :jobId を受け取る) */}
            <Route
                path="/result"
                element={
                    <AuthGuard>
                        <ResultPage />
                    </AuthGuard>
                }
            />

            <Route path="/sample" element={<SamplePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users" element={<UserAdminPage />} />
            <Route path="/result-list" element={<ResultListPage />} />
            <Route path="/logs" element={<LogsPage />} />

        </Routes>
    );
};