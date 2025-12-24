import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';

// プロンプト設定の型
export interface PromptConfig {
    total_incidents: number;
    fact_incidents: number;
    countermeasures_per_case: number;
    include_predicted_incidents: boolean;
}

// テナント設定レスポンスの型
export interface TenantConfigResponse {
    tenant_id: string;
    prompt_config: PromptConfig;
}

// 更新リクエストの型
export interface TenantConfigUpdateRequest {
    prompt_config: PromptConfig;
}

export const tenantConfigService = {
    /**
     * テナント設定を取得
     */
    get: async (): Promise<TenantConfigResponse> => {
        const { data } = await api.get<TenantConfigResponse>(ENDPOINTS.TENANT_CONFIG);
        return data;
    },

    /**
     * テナント設定を更新
     */
    update: async (config: TenantConfigUpdateRequest): Promise<TenantConfigResponse> => {
        const { data } = await api.put<TenantConfigResponse>(ENDPOINTS.TENANT_CONFIG, config);
        return data;
    },
};