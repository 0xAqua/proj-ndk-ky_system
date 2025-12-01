import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { EntryPage } from "@/pages/EntryPage";
import { AuthGuard } from '@/features/auth/components/AuthGuard';

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
        </Routes>
    );
};