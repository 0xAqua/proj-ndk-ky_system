import { Flex, Box, Heading, Text } from "@chakra-ui/react";

export const SettingsHeader = () => {
    return (
        <Flex align="center" mb={6} justify="space-between">
            <Box>
                <Heading size="lg" mb={1} color="gray.800">
                    高度な設定
                </Heading>
                <Text color="gray.500" fontSize="sm">
                    システム全体の動作や認証方法を変更できます。
                </Text>
            </Box>
        </Flex>
    );
};