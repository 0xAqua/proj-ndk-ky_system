import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';

// ─────────────────────────────
// プロンプト設定
// ─────────────────────────────
export interface PromptConfig {
    total_incidents: number;
    fact_incidents: number;
    countermeasures_per_case: number;
    include_predicted_incidents: boolean;
}

export interface PromptConfigResponse {
    tenant_id: string;
    prompt_config: PromptConfig;
}

export interface PromptConfigUpdateRequest {
    prompt_config: PromptConfig;
}

// ─────────────────────────────
// セキュリティ設定
// ─────────────────────────────
export interface SecurityConfig {
    otp_enabled: boolean;
    passkey_enabled: boolean;
}

export interface SecurityConfigResponse {
    tenant_id: string;
    security_config: SecurityConfig;
}

export interface SecurityConfigUpdateRequest {
    security_config: SecurityConfig;
}

// ─────────────────────────────
// Service
// ─────────────────────────────
export const tenantConfigService = {
    prompt: {
        /**
         * プロンプト設定を取得
         */
        get: async (): Promise<PromptConfigResponse> => {
            const { data } = await api.get<PromptConfigResponse>(ENDPOINTS.TENANT_CONFIG.PROMPT);
            return data;
        },

        /**
         * プロンプト設定を更新
         */
        update: async (config: PromptConfigUpdateRequest): Promise<PromptConfigResponse> => {
            const { data } = await api.put<PromptConfigResponse>(ENDPOINTS.TENANT_CONFIG.PROMPT, config);
            return data;
        },
    },

    security: {
        /**
         * セキュリティ設定を取得
         */
        get: async (): Promise<SecurityConfigResponse> => {
            const { data } = await api.get<SecurityConfigResponse>(ENDPOINTS.TENANT_CONFIG.SECURITY);
            return data;
        },

        /**
         * セキュリティ設定を更新
         */
        update: async (config: SecurityConfigUpdateRequest): Promise<SecurityConfigResponse> => {
            const { data } = await api.put<SecurityConfigResponse>(ENDPOINTS.TENANT_CONFIG.SECURITY, config);
            return data;
        },
    },
};