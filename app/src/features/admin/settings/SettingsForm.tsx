import { Box, Button, Flex, VStack } from "@chakra-ui/react";
import { PiFloppyDisk } from "react-icons/pi";
import { SettingsHeader } from "@/features/admin/settings/components/SettingsHeader";
import { AIOutputSettings } from "@/features/admin/settings/components/AIOutputSettings";
import { AuthSettings } from "@/features/admin/settings/components/AuthSettings";
import { SettingsNav } from "@/features/admin/settings/components/SettingsNav";
import { AIOutputConfirmDialog } from "@/features/admin/settings/components/AIOutputConfirmDialog";
import { AuthConfirmDialog } from "@/features/admin/settings/components/AuthConfirmDialog";
import { useAIOutputSettings } from "@/features/admin/settings/hooks/useAIOutputSettings";
import { useSecuritySettings } from "@/features/admin/settings/hooks/useSecuritySettings";
import { useEffect, useState } from "react";
import type { PromptConfig, SecurityConfig } from "@/lib/service/tenantConfig";

type SettingsSection = "ai-output" | "auth";

export const SettingsForm = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>("ai-output");

    // AI出力設定
    const {
        config: aiConfig,
        isLoading: isAiLoading,
        isSaving: isAiSaving,
        updateConfig: updateAiConfig
    } = useAIOutputSettings();
    const [localAiConfig, setLocalAiConfig] = useState<PromptConfig | null>(null);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

    // セキュリティ設定
    const {
        config: securityConfig,
        isLoading: isSecurityLoading,
        isSaving: isSecuritySaving,
        updateConfig: updateSecurityConfig
    } = useSecuritySettings();
    const [localSecurityConfig, setLocalSecurityConfig] = useState<SecurityConfig | null>(null);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

    // AI設定の初期化
    useEffect(() => {
        if (aiConfig && !localAiConfig) {
            setLocalAiConfig(aiConfig);
        }
    }, [aiConfig, localAiConfig]);

    // セキュリティ設定の初期化
    useEffect(() => {
        if (securityConfig && !localSecurityConfig) {
            setLocalSecurityConfig(securityConfig);
        }
    }, [securityConfig, localSecurityConfig]);

    const handleSaveClick = () => {
        if (activeSection === "ai-output") {
            setIsAiDialogOpen(true);
        } else if (activeSection === "auth") {
            setIsAuthDialogOpen(true);
        }
    };

    const handleConfirmAiSave = async () => {
        if (localAiConfig) {
            await updateAiConfig(localAiConfig);
            setIsAiDialogOpen(false);
        }
    };

    const handleConfirmAuthSave = async () => {
        if (localSecurityConfig) {
            await updateSecurityConfig(localSecurityConfig);
            setIsAuthDialogOpen(false);
        }
    };

    // 現在のセクションの状態
    const isLoading = activeSection === "ai-output" ? isAiLoading : isSecurityLoading;
    const isSaving = activeSection === "ai-output" ? isAiSaving : isSecuritySaving;
    const hasChanges = activeSection === "ai-output"
        ? localAiConfig !== null
        : localSecurityConfig !== null;

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
                                    config={localAiConfig || aiConfig}
                                    onChange={setLocalAiConfig}
                                    isLoading={isAiLoading}
                                />
                            )}
                            {activeSection === "auth" && (
                                <AuthSettings
                                    config={localSecurityConfig || securityConfig}
                                    onChange={setLocalSecurityConfig}
                                    isLoading={isSecurityLoading}
                                />
                            )}
                        </Box>

                        <Flex justify="flex-end">
                            <Button
                                bg="orange.500"
                                color="white"
                                size="lg"
                                px={8}
                                borderRadius="md"
                                _hover={{ bg: "orange.600" }}
                                onClick={handleSaveClick}
                                loading={isSaving}
                                disabled={isLoading || !hasChanges}
                            >
                                <PiFloppyDisk style={{ marginRight: "8px" }} />
                                変更を保存
                            </Button>
                        </Flex>
                    </VStack>
                </Box>
            </Flex>

            {/* AI出力設定の確認ダイアログ */}
            <AIOutputConfirmDialog
                open={isAiDialogOpen}
                onOpenChange={setIsAiDialogOpen}
                onConfirm={handleConfirmAiSave}
                isSaving={isAiSaving}
            />

            {/* 認証設定の確認ダイアログ */}
            <AuthConfirmDialog
                open={isAuthDialogOpen}
                onOpenChange={setIsAuthDialogOpen}
                onConfirm={handleConfirmAuthSave}
                isSaving={isSecuritySaving}
            />
        </Box>
    );
};