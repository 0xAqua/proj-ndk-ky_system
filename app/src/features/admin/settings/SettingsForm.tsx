import { Box, Button, Flex, VStack } from "@chakra-ui/react";
import { PiFloppyDisk } from "react-icons/pi";
import { SettingsHeader } from "@/features/admin/settings/components/SettingsHeader";
import { AIOutputSettings } from "@/features/admin/settings/components/AIOutputSettings";
import { AuthSettings } from "@/features/admin/settings/components/AuthSettings";
import { SettingsNav } from "@/features/admin/settings/components/SettingsNav";
import { useAIOutputSettings } from "@/features/admin/settings/hooks/useAIOutputSettings";
import {useEffect, useState} from "react";
import type {PromptConfig} from "@/lib//service/tenantConfig";

type SettingsSection = "ai-output" | "auth";

export const SettingsForm = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>("ai-output");
    const { config, isLoading, isSaving, updateConfig } = useAIOutputSettings();
    const [localConfig, setLocalConfig] = useState<PromptConfig | null>(null);

    // configが取得されたら一度だけlocalConfigを初期化
    useEffect(() => {
        if (config && !localConfig) {
            setLocalConfig(config);
        }
    }, [config, localConfig]);

    const handleSave = async () => {
        if (activeSection === "ai-output" && localConfig) {
            await updateConfig(localConfig);
        }
    };

    return (
        <Box maxW="5xl" mx="auto">
            <SettingsHeader />
            <Flex gap={8}>
                <SettingsNav activeSection={activeSection} onSectionChange={setActiveSection} />
                <Box flex={1}>
                    <VStack gap={6} align="stretch">
                        <Box bg="white" p={8} borderRadius="xl" borderWidth="1px" borderColor="gray.200" shadow="sm">
                            {activeSection === "ai-output" && (
                                <AIOutputSettings
                                    config={localConfig || config}
                                    onChange={setLocalConfig}
                                    isLoading={isLoading}
                                />
                            )}
                            {activeSection === "auth" && <AuthSettings />}
                        </Box>

                        <Flex justify="flex-end">
                            <Button
                                bg="orange.500"
                                color="white"
                                size="lg"
                                px={8}
                                borderRadius="md"
                                _hover={{ bg: "orange.600" }}
                                onClick={handleSave}
                                loading={isSaving}
                                disabled={isLoading || !localConfig}
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