import { Box, Flex, Text, Image, HStack, Separator } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { Badge } from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { signOut, fetchUserAttributes } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

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
                // Cognitoから属性を取得 (email, given_name, family_name, etc.)
                const attributes = await fetchUserAttributes();

                // メールアドレスがあればセット
                if (attributes.email) {
                    setUserEmail(attributes.email);
                }

                // 名前があればセット (例: custom:name や name 属性など)
                // なければメールアドレスを名前代わりにしたり、'User'としたり調整可能
                const name = attributes.name || attributes.given_name || attributes.email || "User";
                setUserName(name);

            } catch (error) {
                console.error("ユーザー情報の取得に失敗しました", error);
                // セッション切れ等の場合はログイン画面へ飛ばす処理を入れても良い
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
            borderBottomWidth="1px"
            borderColor="gray.100"
        >
            <Flex justify="space-between" align="center">

                <Flex align="center" gap={3}>
                    <Image src={logo} alt="Logo" h="32px" objectFit="contain" />
                    <HStack align="start" gap={2}>
                        <Text fontSize="sm" fontWeight="bold" color="gray.800" lineHeight="1.2">
                            危険予知システム
                        </Text>
                        <Badge variant="surface" colorPalette="green" size="xs">
                            Beta
                        </Badge>
                    </HStack>
                </Flex>

                <MenuRoot positioning={{ placement: "bottom-end" }}>
                    <MenuTrigger asChild>
                        <HStack gap={1} cursor="pointer" _hover={{ opacity: 0.8 }}>
                            {/* name属性にセットすると、自動でイニシャル画像になります */}
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
                            {/* 取得したメールアドレスを表示 */}
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