import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    Box,
    Flex,
    VStack,
    Link as ChakraLink,
    Text,
    Center,
    Icon,
    IconButton, Image
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { Avatar } from "@/components/ui/avatar.tsx";

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
                                        <Text fontSize="sm" fontWeight={activeState ? "bold" : "medium"} ml={1}>
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
        name: "管理者 太郎",
        email: "admin@example.com",
        avatarUrl: "https://bit.ly/broken-link"
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
                        _hover={{ bg: "gray.300" }}
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
                    <NavItem to="/logs" icon={PiFileText} label="操作ログ・履歴" isExpanded={isExpanded} />
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

                    <NavItem to="/settings" icon={PiGear} label="設定" isExpanded={isExpanded} />

                    <Box w="full" px={2} mt={2}>
                        <Tooltip
                            content="ログアウト: 管理者太郎"
                            positioning={{ placement: "right" }}
                            showArrow
                            disabled={isExpanded}
                        >
                            <Flex
                                as="button"
                                w="full"
                                align="center"
                                h="40px"
                                borderRadius="lg"
                                transition="all 0.2s"
                                _hover={{ bg: "gray.200" }}
                                overflow="hidden"
                                cursor="pointer"
                            >
                                <Center w="48px" h="40px" flexShrink={0}>
                                    <Avatar name={user.name} src={user.avatarUrl} size="xs" />
                                </Center>

                                <Box
                                    opacity={isExpanded ? 1 : 0}
                                    width={isExpanded ? "auto" : 0}
                                    transition="all 0.3s cubic-bezier(0.2, 0, 0, 1)"
                                    whiteSpace="nowrap"
                                    textAlign="left"
                                    ml={1}
                                >
                                    <Text fontSize="sm" fontWeight="bold" color="black">{user.name}</Text>
                                    <Text fontSize="xs" color="gray.500">{user.email}</Text>
                                </Box>
                            </Flex>
                        </Tooltip>
                    </Box>
                </VStack>

            </Flex>
        </Box>
    );
};