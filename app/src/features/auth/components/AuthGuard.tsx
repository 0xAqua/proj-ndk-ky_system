import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";
import { useAuth } from "@/features/auth/hooks/useAuth";

type UserRole = 'admin' | 'user';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

/**
 * AuthGuard: 認証と認可を制御するガードコンポーネント
 * TanStack Query のキャッシュを活用し、ゼロ遅延での表示を実現します。
 */
export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. キャッシュから認証状態を取得
    const { isAuthenticated, user, isLoading } = useAuth();

    // 無操作ログアウトの監視
    useAutoLogout();

    // 2. リダイレクトロジック
    useEffect(() => {
        // ロードが完了しており、かつ未認証の場合のみログインへ飛ばす
        if (!isLoading && !isAuthenticated) {
            navigate("/login", { state: { from: location }, replace: true });
            return;
        }

        // ロール（権限）の判定
        if (!isLoading && isAuthenticated && user && allowedRoles) {
            const currentRole = (user.tenantUser?.role || user.role) as UserRole;
            if (!allowedRoles.includes(currentRole)) {
                console.warn("Access denied: Insufficient permissions");
                navigate("/entry", { replace: true });
            }
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, navigate, location]);

    // ──────────────────────────────────────────────────────────
    // ★ 修正ポイント: クルクルを出す条件を最小化
    // ──────────────────────────────────────────────────────────
    // 「未認証」かつ「読み込み中」の場合のみ Spinner を表示します。
    // ログイン済みであれば、バックグラウンドで再取得中 (isLoading: true) でも即座に children を返します。
    if (isLoading && !isAuthenticated) {
        return null;
    }

    // 認証済みならコンテンツを表示。未認証なら useEffect でのリダイレクトを待つために null を返す。
    return isAuthenticated ? <>{children}</> : null;
};