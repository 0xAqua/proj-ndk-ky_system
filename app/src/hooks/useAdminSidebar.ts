import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/lib/service/auth";

const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SIDEBAR_EXPANDED_KEY = "ui_sidebar_expanded";

export const useAdminSidebar = () => {
    const navigate = useNavigate();
    const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: "", email: "" });
    const [isExpanded, setIsExpanded] = useState(() => localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "true");

    const handleAuthFailure = useCallback(() => {
        setAuthState("unauthenticated");
        const returnUrl = encodeURIComponent(window.location.pathname);
        navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
    }, [navigate]);

    const verifySession = useCallback(async () => {
        try {
            const session = await authService.checkSession();
            if (!session.authenticated || !session.user) return false;

            const user = session.user;
            setUserInfo({
                name: `${user?.family_name || ""}${user?.given_name || ""}`.trim() || user?.email || "ユーザー",
                email: user.email || "",
            });
            return true;
        } catch (error) {
            return false;
        }
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(prev => {
            localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(!prev));
            return !prev;
        });
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await authService.logout();
        } finally {
            setAuthState("unauthenticated");
            navigate("/login", { replace: true });
        }
    };

    // 初回・定期・可視性チェックのEffect
    useEffect(() => {
        const init = async () => {
            (await verifySession()) ? setAuthState("authenticated") : handleAuthFailure();
        };
        void init();
    }, [verifySession, handleAuthFailure]);

    useEffect(() => {
        if (authState !== "authenticated") return;
        const interval = setInterval(async () => {
            if (!(await verifySession())) handleAuthFailure();
        }, SESSION_CHECK_INTERVAL_MS);

        const handleVisibility = async () => {
            if (document.visibilityState === "visible" && !(await verifySession())) handleAuthFailure();
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [authState, verifySession, handleAuthFailure]);

    return { authState, userInfo, isExpanded, isLoggingOut, toggleExpanded, handleLogout };
};