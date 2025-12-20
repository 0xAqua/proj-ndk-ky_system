import { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Box,
    Flex,
    VStack,
    Link as ChakraLink,
    Text,
    Center,
    Icon,
    IconButton,
    Image,
    MenuRoot,
    MenuTrigger,
    MenuContent,
    Separator,
    MenuItem,
    Portal,
    MenuPositioner,
    Spinner,
} from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { Avatar } from "@/components/ui/avatar.tsx";
import { authService } from "@/lib/service/auth";

import {
    PiSquaresFour,
    PiUsers,
    PiFileText,
    PiGear,
    PiSparkle,
    PiPencilSimple,
    PiListChecks,
    PiList,
    PiSidebarSimple,
    PiDatabase,
} from "react-icons/pi";
import logo from "@/assets/logo.jpg";
import type { IconType } from "react-icons";

// ================================================================
// セキュリティ定数
// ================================================================

// セッションチェック間隔（5分）- トークン有効期限より短く設定
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// 非機密のUI設定のみlocalStorageに保存（認証情報は絶対に保存しない）
const SIDEBAR_EXPANDED_KEY = "ui_sidebar_expanded";

// ================================================================
// 型定義
// ================================================================

type AuthState = "checking" | "authenticated" | "unauthenticated";

type UserInfo = {
    name: string;
    email: string;
};

type NavItemProps = {
    icon: IconType;
    to: string;
    label: string;
    isExpanded: boolean;
    isExternal?: boolean;
    iconColor?: string;
    iconBg?: string;
};

// ================================================================
// セキュアなストレージユーティリティ
// ================================================================

/**
 * UI設定のみを安全に保存・取得するユーティリティ
 * 注意: 認証情報、トークン、個人情報は絶対に保存しないこと
 */
const secureUIStorage = {
    getSidebarExpanded: (): boolean => {
        try {
            // localStorageはXSS攻撃に脆弱なため、機密情報は保存しない
            // サイドバーの開閉状態は非機密のUI設定なので許容
            const value = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
            return value === "true";
        } catch {
            // プライベートブラウジングなどでlocalStorageが使えない場合
            return false;
        }
    },
    setSidebarExpanded: (expanded: boolean): void => {
        try {
            localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(expanded));
        } catch {
            // 保存失敗しても機能に影響なし
        }
    },
};

// ================================================================
// ナビゲーションアイテムコンポーネント
// ================================================================

const NavItem = ({
                     icon,
                     to,
                     label,
                     isExpanded,
                     isExternal,
                     iconColor,
                     iconBg,
                 }: NavItemProps) => {
    return (
        <Box w="full" px={2} mb={2}>
            <Tooltip
                content={label}
                positioning={{ placement: "right" }}
                showArrow
                disabled={isExpanded}
                openDelay={0}
            >
                <ChakraLink asChild unstyled>
                    <NavLink to={to} end={to === "/admin"}>
                        {({ isActive }) => {
                            const activeState = !isExternal && isActive;
                            return (
                                <Flex
                                    align="center"
                                    h="40px"
                                    cursor="pointer"
                                    borderRadius="lg"
                                    transition="all 0.2s"
                                    bg={activeState ? "#f5f0e8" : "transparent"}
                                    color="black"
                                    _hover={{
                                        bg: activeState ? "#ebe5db" : "#faf5f0",
                                    }}
                                    _active={{
                                        transform: "scale(0.90)",
                                    }}
                                    overflow="hidden"
                                    position="relative"
                                >
                                    <Center w="48px" h="40px" flexShrink={0}>
                                        <Center
                                            w={iconBg ? "32px" : "auto"}
                                            h={iconBg ? "32px" : "auto"}
                                            bg={iconBg}
                                            borderRadius="full"
                                        >
                                            <Icon
                                                as={icon}
                                                fontSize={iconBg ? "lg" : "2xl"}
                                                color={iconColor}
                                            />
                                        </Center>
                                    </Center>

                                    <Box
                                        opacity={isExpanded ? 1 : 0}
                                        width={isExpanded ? "auto" : 0}
                                        transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                                        whiteSpace="nowrap"
                                    >
                                        <Text fontSize="sm" ml={1}>
                                            {label}
                                        </Text>
                                    </Box>
                                </Flex>
                            );
                        }}
                    </NavLink>
                </ChakraLink>
            </Tooltip>
        </Box>
    );
};

// ================================================================
// ローディングコンポーネント
// ================================================================

const AuthCheckingSpinner = () => (
    <Flex
        w="64px"
        h="100vh"
        align="center"
        justify="center"
        borderRightWidth="1px"
        borderColor="gray.200"
    >
        <Spinner size="sm" color="gray.400" />
    </Flex>
);

// ================================================================
// メインコンポーネント
// ================================================================

export const AdminSidebar = () => {
    const navigate = useNavigate();

    // 認証状態（checking → authenticated/unauthenticated）
    const [authState, setAuthState] = useState<AuthState>("checking");

    // UI状態
    const [isExpanded, setIsExpanded] = useState(() =>
        secureUIStorage.getSidebarExpanded()
    );

    // ユーザー情報（認証後のみ設定）
    const [userInfo, setUserInfo] = useState<UserInfo>({
        name: "",
        email: "",
    });

    // ログアウト処理中フラグ
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /**
     * セッション検証
     * - HttpOnly Cookieベースの認証をBFF経由で検証
     * - トークンはフロントエンドに露出させない
     */
    const verifySession = useCallback(async (): Promise<boolean> => {
        try {
            // BFF APIを通じてセッションを検証
            // HttpOnly Cookieが自動的に送信される
            const session = await authService.checkSession();

            if (!session.authenticated || !session.user) {
                return false;
            }

            const user = session.user;

            // ユーザー情報を状態に設定（機密情報はメモリ内のみ）
            let displayName = user.name;
            if (!displayName && (user.family_name || user.given_name)) {
                displayName = `${user.family_name || ""} ${user.given_name || ""}`.trim();
            }
            if (!displayName) {
                displayName = user.email || "ユーザー";
            }

            setUserInfo({
                name: displayName,
                email: user.email || "",
            });

            return true;
        } catch (error) {
            console.error("セッション検証エラー:", error);
            return false;
        }
    }, []);

    /**
     * 認証失敗時の処理
     */
    const handleAuthFailure = useCallback(() => {
        setAuthState("unauthenticated");
        // 状態をクリア
        setUserInfo({ name: "", email: "" });
        // ログインページへリダイレクト（現在のURLを保持）
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
    }, [navigate]);

    /**
     * 初回認証チェック
     */
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            const isValid = await verifySession();

            if (!isMounted) return;

            if (isValid) {
                setAuthState("authenticated");
            } else {
                handleAuthFailure();
            }
        };

        void initAuth();

        return () => {
            isMounted = false;
        };
    }, [verifySession, handleAuthFailure]);

    /**
     * 定期的なセッション検証
     * - トークン期限切れを検出
     * - 不正アクセスを早期検出
     */
    useEffect(() => {
        if (authState !== "authenticated") return;

        const intervalId = setInterval(async () => {
            const isValid = await verifySession();
            if (!isValid) {
                handleAuthFailure();
            }
        }, SESSION_CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [authState, verifySession, handleAuthFailure]);

    /**
     * ページ可視性変更時のセッション再検証
     * - タブがアクティブになった時に検証
     */
    useEffect(() => {
        if (authState !== "authenticated") return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === "visible") {
                const isValid = await verifySession();
                if (!isValid) {
                    handleAuthFailure();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [authState, verifySession, handleAuthFailure]);

    /**
     * セキュアなログアウト処理
     */
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            // BFF経由でログアウト（サーバー側でCookieを無効化）
            await authService.logout();
        } catch (error) {
            console.error("ログアウトエラー:", error);
        } finally {
            // エラーが発生してもクライアント側の状態はクリア
            setUserInfo({ name: "", email: "" });
            setAuthState("unauthenticated");
            // ログインページへリダイレクト
            navigate("/login", { replace: true });
        }
    };

    /**
     * サイドバー開閉トグル
     */
    const toggleExpanded = () => {
        setIsExpanded((prev) => {
            const next = !prev;
            secureUIStorage.setSidebarExpanded(next);
            return next;
        });
    };

    // ================================================================
    // レンダリング
    // ================================================================

    // 認証チェック中は最小限のUIを表示
    if (authState === "checking") {
        return <AuthCheckingSpinner />;
    }

    // 未認証の場合は何も表示しない（リダイレクト中）
    if (authState === "unauthenticated") {
        return null;
    }

    const COLLAPSED_W = "64px";
    const EXPANDED_W = "240px";
    const width = isExpanded ? EXPANDED_W : COLLAPSED_W;

    return (
        <Box
            as="aside"
            w={width}
            h="100vh"
            borderRightWidth="1px"
            borderColor="gray.200"
            position="sticky"
            top={0}
            flexShrink={0}
            zIndex={20}
            transition="width 0.3s cubic-bezier(0.2, 0, 0, 1)"
            shadow={isExpanded ? "xl" : "none"}
        >
            <Flex direction="column" h="full">
                {/* ヘッダーエリア */}
                <Flex
                    align="center"
                    h="64px"
                    px={2}
                    mb={4}
                    flexShrink={0}
                    justifyContent={isExpanded ? "space-between" : "center"}
                    transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                >
                    <Flex
                        align="center"
                        gap={2}
                        opacity={isExpanded ? 1 : 0}
                        width={isExpanded ? "auto" : 0}
                        overflow="hidden"
                        whiteSpace="nowrap"
                        transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                        ml={isExpanded ? 2 : 0}
                        mt={4}
                    >
                        <Image
                            src={logo}
                            alt="Logo"
                            h="62px"
                            objectFit="contain"
                            flexShrink={0}
                        />
                    </Flex>

                    <IconButton
                        aria-label="Toggle Menu"
                        onClick={toggleExpanded}
                        variant="ghost"
                        size="md"
                        color="black"
                        borderRadius="lg"
                        _hover={{ bg: "#ebe5db" }}
                        _active={{ transform: "scale(0.95)" }}
                        transition="all 0.2s"
                        mt={4}
                    >
                        {isExpanded ? (
                            <PiSidebarSimple
                                size={24}
                                style={{ transform: "rotate(180deg)" }}
                            />
                        ) : (
                            <PiList size={24} />
                        )}
                    </IconButton>
                </Flex>

                {/* ナビゲーションリスト */}
                <VStack
                    gap={0}
                    flex={1}
                    w="full"
                    align="flex-start"
                    overflowX="hidden"
                    mt={4}
                >
                    <NavItem
                        to="/sample"
                        icon={PiSquaresFour}
                        label="ダッシュボード"
                        isExpanded={isExpanded}
                    />
                    <NavItem
                        to="/users"
                        icon={PiUsers}
                        label="ユーザー管理"
                        isExpanded={isExpanded}
                    />
                    <NavItem
                        to="/results"
                        icon={PiListChecks}
                        label="結果一覧"
                        isExpanded={isExpanded}
                    />
                    <NavItem
                        to="/master"
                        icon={PiDatabase}
                        label="工事マスタ管理"
                        isExpanded={isExpanded}
                    />
                    <NavItem
                        to="/advanced-settings"
                        icon={PiSparkle}
                        label="高度な設定"
                        isExpanded={isExpanded}
                    />
                    <NavItem
                        to="/logs"
                        icon={PiFileText}
                        label="ログ管理"
                        isExpanded={isExpanded}
                    />
                </VStack>

                {/* フッターエリア */}
                <VStack gap={0} mb={4} w="full" align="flex-start" overflowX="hidden">
                    <Box w="full" px={2}>
                        <Box w="full" h="1px" bg="gray.200" my={2} />
                    </Box>

                    <NavItem
                        to="/entry"
                        icon={PiPencilSimple}
                        label="新規登録"
                        isExpanded={isExpanded}
                        isExternal
                        iconColor="white"
                        iconBg="orange.500"
                    />

                    <NavItem
                        to="/settings"
                        icon={PiGear}
                        label="システム設定"
                        isExpanded={isExpanded}
                    />

                    {/* ユーザーメニュー */}
                    <Box w="full" px={2} mt={2}>
                        <MenuRoot>
                            <MenuTrigger asChild>
                                <Flex
                                    as="button"
                                    w="full"
                                    align="center"
                                    h="40px"
                                    borderRadius="lg"
                                    transition="all 0.2s"
                                    _hover={{ bg: "#ebe5db" }}
                                    overflow="hidden"
                                    cursor="pointer"
                                >
                                    <Center w="48px" h="40px" flexShrink={0}>
                                        <Avatar name={userInfo.name} size="xs" />
                                    </Center>

                                    <Box
                                        opacity={isExpanded ? 1 : 0}
                                        width={isExpanded ? "auto" : 0}
                                        transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                                        whiteSpace="nowrap"
                                        textAlign="left"
                                        ml={1}
                                        flex={1}
                                    >
                                        <Text fontSize="sm" fontWeight="bold" color="black">
                                            {userInfo.name}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {userInfo.email}
                                        </Text>
                                    </Box>

                                    {isExpanded && (
                                        <Box color="gray.400" mr={2}>
                                            <LuChevronDown size={14} />
                                        </Box>
                                    )}
                                </Flex>
                            </MenuTrigger>

                            <Portal>
                                <MenuPositioner>
                                    <MenuContent
                                        minW="220px"
                                        shadow="xl"
                                        borderWidth="1px"
                                        borderColor="gray.200"
                                        bg="#fffffe"
                                        zIndex={1000}
                                        css={{
                                            animation: "none !important",
                                            transition: "none !important",
                                            transform: "none !important",
                                        }}
                                    >
                                        <Box px={3} py={2}>
                                            <Text fontSize="sm" color="gray.500">
                                                {userInfo.email || "読み込み中..."}
                                            </Text>
                                        </Box>

                                        <Separator />

                                        <MenuItem
                                            value="logout"
                                            color="red.600"
                                            _hover={{ bg: "red.50", color: "red.700" }}
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            gap={2}
                                            cursor="pointer"
                                        >
                                            {isLoggingOut ? (
                                                <Spinner size="xs" />
                                            ) : (
                                                <LuLogOut />
                                            )}
                                            <Text fontWeight="bold">
                                                {isLoggingOut ? "ログアウト中..." : "ログアウト"}
                                            </Text>
                                        </MenuItem>
                                    </MenuContent>
                                </MenuPositioner>
                            </Portal>
                        </MenuRoot>
                    </Box>
                </VStack>
            </Flex>
        </Box>
    );
};