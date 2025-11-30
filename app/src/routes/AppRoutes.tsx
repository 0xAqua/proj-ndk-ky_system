import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import EntryPage from "@/pages/EntryPage";

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/entry" element={<EntryPage />} />
            {/* 今後ここにページを追加していく */}
            {/* <Route path="/entry" element={<EntryPage />} /> */}
        </Routes>
    );
};