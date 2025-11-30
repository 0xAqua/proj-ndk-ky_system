// src/routes/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* 今後ここにページを追加していく */}
            {/* <Route path="/entry" element={<EntryPage />} /> */}
        </Routes>
    );
};