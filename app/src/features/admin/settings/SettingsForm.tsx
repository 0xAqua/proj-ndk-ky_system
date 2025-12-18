import { Box, Button, Flex, VStack } from "@chakra-ui/react";
import { PiFloppyDisk } from "react-icons/pi";
import { SettingsHeader } from "@/features/admin/settings/components/SettingsHeader";
import { AIOutputSettings } from "@/features/admin/settings/components/AIOutputSettings";
import { AuthSettings } from "@/features/admin/settings/components/AuthSettings";
import {useState} from "react";
import {SettingsNav} from "@/features/admin/settings/components/SettingsNav.tsx";


type SettingsSection = "ai-output" | "auth";

export const SettingsForm = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>("ai-output");

    const handleSave = () => {
        console.log("設定を保存しました");
    };

    return (
        <Box maxW="5xl" mx="auto">
            <SettingsHeader />

            <Flex gap={8}>
                {/* 左サイドナビゲーション */}
                <SettingsNav
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                />
                {/* 右コンテンツエリア */}
                <Box flex={1}>
                    <VStack gap={6} align="stretch">
                        <Box
                            bg="white"
                            p={8}
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor="gray.200"
                            shadow="sm"
                        >
                            {activeSection === "ai-output" && <AIOutputSettings />}
                            {activeSection === "auth" && <AuthSettings />}
                        </Box>

                        {/* 保存ボタン */}
                        <Flex justify="flex-end">
                            <Button
                                bg="orange.500"
                                color="white"
                                size="lg"
                                px={8}
                                borderRadius="md"
                                _hover={{ bg: "orange.600" }}
                                onClick={handleSave}
                            >
                                <PiFloppyDisk style={{ marginRight: "8px" }} />
                                変更を保存
                            </Button>
                        </Flex>
                    </VStack>
                </Box>
            </Flex>
        </Box>
    );
};