import { useState, useEffect, useCallback } from 'react';
import { tenantConfigService, type SecurityConfig } from '@/lib/service/tenantConfig';
import {useNotification} from "@/hooks/useNotification.ts";

export const useSecuritySettings = () => {
    const [config, setConfig] = useState<SecurityConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notify = useNotification();

    // 設定取得
    const fetchConfig = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await tenantConfigService.security.get();
            setConfig(response.security_config);
        } catch (error) {
            notify.error("セキュリティ設定の取得に失敗しました", "エラー")
            // デフォルト値をセット
            setConfig({
                otp_enabled: false,
                passkey_enabled: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchConfig();
    }, [fetchConfig]);

    // 設定更新
    const updateConfig = useCallback(async (newConfig: SecurityConfig) => {
        try {
            setIsSaving(true);
            await tenantConfigService.security.update({
                security_config: newConfig,
            });
            setConfig(newConfig);
            notify.success("セキュリティ設定を更新しました", "設定完了")
        } catch (error) {
            notify.error("セキュリティ設定の更新に失敗しました", "エラー")
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, []);

    return {
        config,
        isLoading,
        isSaving,
        updateConfig,
        refetch: fetchConfig,
    };
};