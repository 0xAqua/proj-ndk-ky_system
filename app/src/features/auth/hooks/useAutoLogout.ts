import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bffAuth } from '@/lib/bffAuth'; // ★変更

// 無操作許容時間（ミリ秒）: 15分
const TIMEOUT_MS = 15 * 60 * 1000;

export const useAutoLogout = () => {
    const navigate = useNavigate();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ログアウト処理
    const handleLogout = useCallback(async () => {
        try {
            await bffAuth.logout(); // ★変更
            if (timerRef.current) clearTimeout(timerRef.current);

            navigate('/login');
            // 必要に応じてアラートやトーストを表示
            // alert('一定時間操作がなかったためログアウトしました。');
        } catch (error) {
            console.error('Auto logout failed:', error);
        }
    }, [navigate]);

    // タイマーリセット
    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    }, [handleLogout]);

    useEffect(() => {
        // 監視対象のイベント
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        events.forEach((event) => window.addEventListener(event, resetTimer));

        resetTimer(); // 初期化

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer]);
};