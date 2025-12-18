// components/settings/SettingsNav.tsx
import { Box, VStack, Text } from "@chakra-ui/react";

type SettingsSection = "ai-output" | "auth";

interface SettingsNavProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
}

const navItems = [
    {
        id: "ai-output" as const,
        label: "AI出力設定"
    },
    {
        id: "auth" as const,
        label: "認証設定"
    },
];

export const SettingsNav = ({ activeSection, onSectionChange }: SettingsNavProps) => {
    return (
        <Box
            w="220px"
            flexShrink={0}
        >
            <VStack align="stretch" gap={1}>
                {navItems.map((item) => {
                    const isActive = activeSection === item.id;

                    return (
                        <Box
                            key={item.id}
                            px={4}
                            py={2}
                            borderRadius="md"
                            cursor="pointer"
                            bg={isActive ? "#ede9e3" : "transparent"}
                            _hover={{
                                bg: isActive ? "#ede9e3" : "#f5f3ef"
                            }}
                            _active={{
                                transform: "scale(0.98)"
                            }}
                            transition="all 0.15s ease"
                            onClick={() => onSectionChange(item.id)}
                        >
                            <Text
                                fontSize="sm"
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