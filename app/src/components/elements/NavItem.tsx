import { NavLink } from "react-router-dom";
import {
    Box,
    Flex,
    Center,
    Icon,
    Text,
    Link as ChakraLink,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip.tsx";
import type { IconType } from "react-icons";

// ================================================================
// 型定義
// ================================================================

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
// コンポーネント
// ================================================================

export const NavItem = ({
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
            {/* サイドバーが閉じている時のみツールチップを表示 */}
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
                            // 外部リンクではなく、かつ現在のパスと一致する場合をアクティブとする
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
                                    {/* アイコンエリア */}
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

                                    {/* ラベルエリア（サイドバーの開閉に合わせてアニメーション） */}
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