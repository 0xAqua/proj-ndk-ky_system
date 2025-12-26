// src/components/layout/Header.tsx
import { Box, Flex, Text, Image, HStack, Separator } from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import logo from '@/assets/logo.jpg';

import { Avatar } from "@/components/ui/avatar.tsx";
import {
    MenuContent,
    MenuItem,
    MenuRoot,
    MenuTrigger,
} from "@/components/ui/menu.tsx";

export const Header = () => {
    const { logout, email, role } = useAuth();  // ← 追加

    const displayName = email || "ユーザー";

    return (
        <Box
            as="header"
            bg="white"
            w="full"
            p={3}
            px={5}
            borderRadius="2xl"
            maxW="480px"
            mx="auto"
            shadow="xs"
            borderColor="gray.100"
            position="sticky"
            top={0}
            zIndex="sticky"
        >
            <Flex justify="space-between" align="center" position="relative" h="32px">
                <Box />

                {/* 中央：ロゴとタイトル */}
                <HStack align="center" gap={3} flex="1" justify="center" overflow="hidden">
                    <Image src={logo} alt="Logo" h="42px" objectFit="contain" flexShrink={0} />
                    <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color="gray.800"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                    >
                        危険予知システム
                    </Text>
                </HStack>

                {/* 右側：アバターメニュー */}
                <MenuRoot positioning={{ placement: "bottom-end" }}>
                    <MenuTrigger asChild>
                        <HStack gap={1} cursor="pointer" _hover={{ opacity: 0.8 }}>
                            <Avatar
                                name={displayName}
                                size="sm"
                                colorPalette="blue"
                            />
                            <Box color="gray.400">
                                <LuChevronDown size={14} />
                            </Box>
                        </HStack>
                    </MenuTrigger>

                    <MenuContent minW="200px" portalled>
                        <Box px={3} py={2}>
                            <Text fontSize="xs" color="gray.500">ログイン中</Text>
                            <Text fontSize="sm" fontWeight="medium" truncate>
                                {email || "---"}
                            </Text>
                            {role && (
                                <Text fontSize="10px" color="blue.600" fontWeight="bold">
                                    {role.toUpperCase()}
                                </Text>
                            )}
                        </Box>

                        <Separator />

                        <MenuItem
                            value="logout"
                            color="red.600"
                            _hover={{ bg: "red.50", color: "red.700" }}
                            onClick={logout}  // ← シンプルに
                            gap={2}
                        >
                            <LuLogOut />
                         </MenuItem>
                    </MenuContent>
                </MenuRoot>
            </Flex>
        </Box>
    );
};