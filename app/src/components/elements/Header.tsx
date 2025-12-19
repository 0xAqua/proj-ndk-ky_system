import { Box, Flex, Text, Image, HStack, Separator } from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { bffAuth } from '@/lib/bffAuth'; // ★変更
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUserStore } from "@/stores/useUserStore.ts";
import logo from '@/assets/logo.jpg';

import { Avatar } from "@/components/ui/avatar.tsx";
import {
    MenuContent,
    MenuItem,
    MenuRoot,
    MenuTrigger,
} from "@/components/ui/menu.tsx";

export const Header = () => {
    const navigate = useNavigate();
    const clearUser = useUserStore((state) => state.clearUser);

    // ユーザー情報を保存するState
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");

    // ★修正: BFF APIからユーザー情報を取得
    useEffect(() => {
        const getUserData = async () => {
            try {
                const session = await bffAuth.checkSession();

                if (!session.authenticated || !session.user) {
                    setUserName("ゲスト");
                    return;
                }

                const user = session.user;

                if (user.email) {
                    setUserEmail(user.email);
                }

                const name = user.name || user.given_name || user.email || "User";
                setUserName(name);
            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました", error);
            }
        };

        void getUserData();
    }, []);

    // ★修正: BFF APIでログアウト
    const handleLogoutClick = async () => {
        try {
            await bffAuth.logout();
            clearUser();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

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

                <Box>
                    {/*<LuMenu size={24} />*/}
                </Box>

                {/* 中央：タイトル */}
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

                {/* --- 右側：アバターメニュー --- */}
                <MenuRoot positioning={{ placement: "bottom-end" }}>
                    <MenuTrigger asChild>
                        <HStack gap={1} cursor="pointer" _hover={{ opacity: 0.8 }}>
                            <Avatar
                                name={userName}
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
                                {userEmail || "読み込み中..."}
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
                </MenuRoot>

            </Flex>
        </Box>
    );
};