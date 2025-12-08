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
    IconButton
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import { Avatar } from "@/components/ui/avatar.tsx";

// Phosphor Icons (pi)
import {
    PiSquaresFour,
    PiUsers,
    PiFileText,
    PiGear,
    PiPencilSimple,
    PiListChecks,
    PiList,
    PiSidebarSimple,
} from "react-icons/pi";
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
};

const NavItem = ({ icon, to, label, isExpanded, isExternal }: NavItemProps) => {
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
                                    bg={activeState ? "gray.100" : "transparent"}
                                    color="black"
                                    _hover={{
                                        bg: activeState ? "gray.300" : "gray.300",
                                    }}
                                    overflow="hidden"
                                    position="relative"
                                >
                                    <Center w="48px" h="40px" flexShrink={0}>
                                        <Icon as={icon} fontSize="2xl" />
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
    const [isExpanded, setIsExpanded] = useState(false);

    const COLLAPSED_W = "64px";
    const EXPANDED_W = "260px";
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
                    >
                        <Center w="24px" h="24px" bg="black" borderRadius="md" color="white" fontSize="xs" fontWeight="bold" flexShrink={0}>G</Center>
                        <Text fontWeight="bold" fontSize="lg" color="black">Genba Admin</Text>
                    </Flex>

                    {/* 開閉ボタン (常に表示) */}
                    <IconButton
                        aria-label="Toggle Menu"
                        onClick={() => setIsExpanded(!isExpanded)}
                        variant="ghost"
                        size="md"
                        color="black"
                        borderRadius="lg"
                        _hover={{ bg: "gray.300" }}
                        transition="all 0.2s"
                    >
                        {isExpanded ? <PiSidebarSimple size={24} style={{ transform: "rotate(180deg)" }} /> : <PiList size={24} />}
                    </IconButton>

                </Flex>

                {/* 2. ナビゲーションリスト */}
                <VStack gap={0} flex={1} w="full" align="flex-start" overflowX="hidden">
                    <NavItem to="/sample" icon={PiSquaresFour} label="ダッシュボード" isExpanded={isExpanded} />
                    <NavItem to="/users" icon={PiUsers} label="ユーザー管理" isExpanded={isExpanded} />
                    <NavItem to="/result-list" icon={PiListChecks} label="結果一覧" isExpanded={isExpanded} />
                    <NavItem to="/logs" icon={PiFileText} label="操作ログ・履歴" isExpanded={isExpanded} />
                </VStack>

                {/* 3. フッターエリア */}
                <VStack gap={0} mb={4} w="full" align="flex-start" overflowX="hidden">

                    <Box w="full" px={2}><Box w="full" h="1px" bg="gray.200" my={2} /></Box>

                    <NavItem to="/entry" icon={PiPencilSimple} label="入力画面へ" isExpanded={isExpanded} isExternal />
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