import { Box, VStack, Text } from '@chakra-ui/react';

type LogType = 'access' | 'operation' | 'execution';

type Props = {
    selectedLog: LogType;
    onSelectLog: (log: LogType) => void;
};

export const LogsSidebar = ({ selectedLog, onSelectLog }: Props) => {
    const menuItems: { key: LogType; label: string }[] = [
        { key: 'access', label: 'アクセス履歴' },
        { key: 'operation', label: '操作履歴' },
        { key: 'execution', label: '実行履歴' },
    ];

    return (
        <Box w="190px" flexShrink={0}>
            <Text fontSize="md" fontWeight="bold" mb={4} px={4} color="gray.800">
                ログ管理
            </Text>

            <VStack align="stretch" gap={1}>
                {menuItems.map((item) => {
                    const isActive = selectedLog === item.key;

                    return (
                        <Box
                            key={item.key}
                            px={4}
                            py={2}
                            borderRadius="md"
                            cursor="pointer"
                            // SettingsNav と同じ配色
                            bg={isActive ? "#ede9e3" : "transparent"}
                            _hover={{
                                bg: isActive ? "#ede9e3" : "#f5f3ef"
                            }}
                            // クリック時のフィードバックを追加
                            _active={{
                                transform: "scale(0.98)"
                            }}
                            transition="all 0.15s ease"
                            onClick={() => onSelectLog(item.key)}
                        >
                            <Text
                                fontSize="sm"
                                fontWeight={isActive ? "bold" : "normal"}
                                color={isActive ? "gray.800" : "gray.600"}
                            >
                                {item.label}
                            </Text>
                        </Box>
                    );
                })}
            </VStack>
        </Box>
    );
};