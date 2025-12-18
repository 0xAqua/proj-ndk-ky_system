import {useEffect, useState} from "react";
import { NavLink } from "react-router-dom";
import {
    Box,
    Flex,
    VStack,
    Link as ChakraLink,
    Text,
    Center,
    Icon,
    IconButton, Image, MenuRoot, MenuTrigger, MenuContent, Separator, MenuItem, Portal, MenuPositioner
} from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { Avatar } from "@/components/ui/avatar.tsx";
import {fetchUserAttributes, signOut} from 'aws-amplify/auth';

// Phosphor Icons (pi)
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
import logo from '@/assets/logo.jpg';
import type { IconType } from "react-icons";


// ----------------------------------------------------------------
// ナビゲーションアイテム
// ----------------------------------------------------------------
type NavItemProps = {
    icon: IconType;
    to: string;
    label: string;
    isExpanded: boolean;
    isExternal?: boolean;
    iconColor?: string;
    iconBg?: string;
};

const NavItem = ({ icon, to, label, isExpanded, isExternal, iconColor, iconBg }: NavItemProps) => {
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
                                        transform: "scale(0.90)"
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
                                            <Icon as={icon} fontSize={iconBg ? "lg" : "2xl"} color={iconColor} />
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

// ----------------------------------------------------------------
// サイドバー本体
// ----------------------------------------------------------------
export const AdminSidebar = () => {
    const [isExpanded, setIsExpanded] = useState(() => {
        return localStorage.getItem("sidebar-expanded") === "true";
    });

    const handleLogoutClick = async () => {
        try {
            await signOut();
            // 必要に応じてリダイレクト処理
            window.location.href = "/login";
        } catch (error) {
            console.error("ログアウトに失敗しました", error);
        }
    };

    // ユーザー情報を保存するState
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("読込中...");

    // 画面表示時にユーザー情報を取得する
    useEffect(() => {
        const getUserData = async () => {
            try {
                const attributes = await fetchUserAttributes();
                if (attributes.email) {
                    setUserEmail(attributes.email);
                }

                // 姓名を結合してフルネームを作成
                let displayName = attributes.name; // まずnameを試す
                if (!displayName && (attributes.family_name || attributes.given_name)) {
                    // family_name と given_name から作成
                    displayName = `${attributes.family_name || ''} ${attributes.given_name || ''}`.trim();
                }
                if (!displayName) {
                    displayName = attributes.email || "ユーザー";
                }

                setUserName(displayName);
            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました", error);
                setUserName("ユーザー");
            }
        };

        void getUserData();
    }, []);

    const toggleExpanded = () => {
        setIsExpanded((prev) => {
            const next = !prev;
            localStorage.setItem("sidebar-expanded", String(next));
            return next;
        });
    };

    const COLLAPSED_W = "64px";
    const EXPANDED_W = "240px";
    const width = isExpanded ? EXPANDED_W : COLLAPSED_W;

    const user = {
        name: userName,
        email: userEmail,
        avatarUrl: undefined
    };

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

                {/* 1. ヘッダーエリア */}
                <Flex
                    align="center"
                    h="64px"
                    px={2}
                    mb={4}
                    flexShrink={0}
                    // 閉じてる時は真ん中、開いてる時は両端
                    justifyContent={isExpanded ? "space-between" : "center"}
                    transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                >
                    {/* ロゴエリア (開いた時だけ出現) */}
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
                        <Image src={logo} alt="Logo" h="62px"  objectFit="contain" flexShrink={0} />
                    </Flex>

                    {/* 開閉ボタン (常に表示) */}
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
                        {isExpanded ? <PiSidebarSimple size={24} style={{ transform: "rotate(180deg)" }} /> : <PiList size={24} />}
                    </IconButton>

                </Flex>

                {/* 2. ナビゲーションリスト */}
                <VStack gap={0} flex={1} w="full" align="flex-start" overflowX="hidden" mt={4}>
                    <NavItem to="/sample" icon={PiSquaresFour} label="ダッシュボード" isExpanded={isExpanded} />
                    <NavItem to="/users" icon={PiUsers} label="ユーザー管理" isExpanded={isExpanded} />
                    <NavItem to="/results" icon={PiListChecks} label="結果一覧" isExpanded={isExpanded} />
                    <NavItem to="/master" icon={PiDatabase} label="工事マスタ管理" isExpanded={isExpanded} />
                    <NavItem to="/advanced-settings" icon={PiSparkle} label="高度な設定" isExpanded={isExpanded} />
                    <NavItem to="/logs" icon={PiFileText} label="ログ管理" isExpanded={isExpanded} />
                </VStack>

                {/* 3. フッターエリア */}
                <VStack gap={0} mb={4} w="full" align="flex-start" overflowX="hidden">

                    <Box w="full" px={2}><Box w="full" h="1px" bg="gray.200" my={2} /></Box>

                    <NavItem
                        to="/entry"
                        icon={PiPencilSimple}
                        label="新規登録"
                        isExpanded={isExpanded}
                        isExternal
                        iconColor="white"
                        iconBg="orange.500"
                    />

                    <NavItem to="/settings" icon={PiGear} label="システム設定" isExpanded={isExpanded} />

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
                                        <Avatar name={user.name} size="xs" />
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
                                        <Text fontSize="sm" fontWeight="bold" color="black">{user.name}</Text>
                                        <Text fontSize="xs" color="gray.500">{user.email}</Text>
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
                                            transform: "none !important"
                                        }}
                                    >
                                        <Box px={3} py={2}>
                                            <Text fontSize="sm" color="gray.500">
                                                {user.email || "読み込み中..."}
                                            </Text>
                                        </Box>

                                        <Separator />

                                        <MenuItem
                                            value="logout"
                                            color="red.600"
                                            _hover={{ bg: "red.50", color: "red.700" }}
                                            onClick={handleLogoutClick}
                                            gap={2}
                                            cursor="pointer"
                                        >
                                            <LuLogOut />
                                            <Text fontWeight="bold">ログアウト</Text>
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