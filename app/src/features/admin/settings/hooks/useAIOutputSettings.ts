import { useState, useEffect, useCallback } from "react";
import { tenantConfigService, type PromptConfig } from "@/lib/service/tenantConfig";
import {useNotification} from "@/hooks/useNotification.ts";

interface UseAIOutputSettingsReturn {
    config: PromptConfig | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    updateConfig: (newConfig: PromptConfig) => Promise<boolean>;
    refetch: () => Promise<void>;
}

export const useAIOutputSettings = (): UseAIOutputSettingsReturn => {
    const [config, setConfig] = useState<PromptConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const notify = useNotification();

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await tenantConfigService.get();
            setConfig(data.prompt_config);
        } catch (err) {
            notify.error("設定のに失敗しました");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateConfig = useCallback(async (newConfig: PromptConfig): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await tenantConfigService.update({ prompt_config: newConfig });
            setConfig(newConfig);
            notify.success("設定を保存しました");
            return true;
        } catch (err) {
            notify.error("設定の保存に失敗しました");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    useEffect(() => {
        void fetchConfig();
    }, [fetchConfig]);

    return {
        config,
        isLoading,
        isSaving,
        error,
        updateConfig,
        refetch: fetchConfig,
    };
};