import { Flex, Box, Heading, Text } from "@chakra-ui/react";


export const UserAdminHeader = () => {

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

            </Flex>
        </>
    );
};