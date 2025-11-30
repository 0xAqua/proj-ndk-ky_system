import { Box, Flex, Text, Image, IconButton } from "@chakra-ui/react";
import logo from '@/assets/logo.png';
import { Badge } from "@chakra-ui/react"
import { LuLogOut } from "react-icons/lu";

export const Header = () => {
    const handleLogoutClick = () => {
        // ログアウト処理
        console.log("ログアウトクリック");
    };

    return (
        <Box
            as="header"
            bg="white"
            w="full"
            p={4}
            px={6}
            borderRadius="2xl"
            maxW="480px"
            mx="auto"
        >
            <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                    <Image src={logo} alt="Logo" h="32px" />
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        危険予知システム
                        <Badge variant="solid" colorPalette={"green"} ml={"2"}>Beta</Badge>
                    </Text>
                </Flex>

                <IconButton
                    aria-label="ログアウト"
                    variant="ghost"
                    onClick={handleLogoutClick}
                >
                    <LuLogOut />
                </IconButton>
            </Flex>

        </Box>
    );
};