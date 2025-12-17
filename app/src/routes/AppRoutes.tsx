import { Routes, Route, Navigate } from 'react-router-dom';
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
            {/* デフォルトルートはログイン画面へリダイレクト */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 公開ページ（ログイン画面）: ここは監視不要なのでそのまま */}
            <Route path="/login" element={<LoginPage />} />

            {/* ─── 以下、ログイン必須ページ（AuthGuardで囲む＝自動ログアウト対象） ─── */}

            <Route
                path="/entry"
                element={
                    <AuthGuard>
                        <EntryPage />
                    </AuthGuard>
                }
            />

            <Route
                path="/result"
                element={
                    <AuthGuard>
                        <ResultPage />
                    </AuthGuard>
                }
            />

            {/* ↓↓ これらも全て AuthGuard で囲みました ↓↓ */}
            <Route
                path="/sample"
                element={
                    <AuthGuard>
                        <SamplePage />
                    </AuthGuard>
                }
            />

            <Route
                path="/settings"
                element={
                    <AuthGuard>
                        <SettingsPage />
                    </AuthGuard>
                }
            />

            <Route
                path="/users"
                element={
                    <AuthGuard>
                        <UserAdminPage />
                    </AuthGuard>
                }
            />

            <Route
                path="/results"
                element={
                    <AuthGuard>
                        <ResultListPage />
                    </AuthGuard>
                }
            />


            <Route
                path="/logs"
                element={
                    <AuthGuard>
                        <LogsPage />
                    </AuthGuard>
                }
            />

        </Routes>
    );
};