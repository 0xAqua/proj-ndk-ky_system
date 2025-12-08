import { Box, Flex, Text, Image, HStack, Separator } from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { signOut, fetchUserAttributes } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from '@/assets/logo.png';

import { Avatar } from "@/components/ui/avatar";
import {
    MenuContent,
    MenuItem,
    MenuRoot,
    MenuTrigger,
} from "@/components/ui/menu";

export const Header = () => {
    const navigate = useNavigate();

    // ユーザー情報を保存するState
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");

    // 画面表示時にユーザー情報を取得する
    useEffect(() => {
        const getUserData = async () => {
            try {
                const attributes = await fetchUserAttributes();
                if (attributes.email) {
                    setUserEmail(attributes.email);
                }
                const name = attributes.name || attributes.given_name || attributes.email || "User";
                setUserName(name);
            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました", error);
            }
        };

        void getUserData();
    }, []);

    const handleLogoutClick = async () => {
        try {
            await signOut();
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
            {/* relativeを指定することで、中のabsolute要素(タイトル)が
               このFlexコンテナを基準に配置されます
            */}
            <Flex justify="space-between" align="center" position="relative" h="32px">

                {/* --- 左側：メニューアイコンなど --- */}
                <Box
                    // as="button" // ボタンとして振る舞う場合
                    // cursor="pointer"
                    // color="gray.600"
                    // _hover={{ color: "gray.900" }}
                    // onClick={() => console.log("Menu clicked")} // メニュー処理など
                >
                    {/*<LuMenu size={24} />*/}
                </Box>

                {/* --- 中央：タイトル (絶対配置でど真ん中へ) --- */}
                {/* --- 中央：ロゴ画像とタイトル --- */}
                <HStack
                    position="absolute"
                    left="50%"
                    transform="translateX(-50%)"
                    align="center"
                    gap={2}
                >
                    {/* 2. ロゴ画像を表示 (テキストに合わせて少し小さめに h="20px" 程度推奨) */}
                    <Image src={logo} alt="Logo" h="22px" objectFit="contain" />

                    <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color="gray.800"
                        whiteSpace="nowrap"
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