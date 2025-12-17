import { useState } from "react";
import { Flex, Box, Heading, Text, Button } from "@chakra-ui/react";
import { PiPlus } from "react-icons/pi";
import { UserAdminAddModal } from "./UserAdminAddModal";

export const UserAdminHeader = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    return (
        <>
            <Flex align="center" mb={6} justify="space-between">
                <Box>
                    <Heading size="lg" mb={1} color="gray.800">
                        ユーザー管理
                    </Heading>
                    <Text color="gray.500" fontSize="sm">
                        システムを利用するユーザーのアカウント、権限、ステータスを管理します。
                    </Text>
                </Box>
                <Button
                    size="md"
                    bg="orange.500"
                    color="white"
                    _hover={{ bg: "orange.600" }}
                    _active={{ bg: "orange.700" }}
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <PiPlus />
                    ユーザーを追加
                </Button>

            </Flex>

            <UserAdminAddModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </>
    );
};