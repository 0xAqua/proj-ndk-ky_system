import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';
import type { ExecutionLogFilterConditions } from '@/features/admin/logs/components/execution/ExecutionLogsFilterModal';

// 1. データ構造の定義（バックエンドの返却値に合わせる）
export type ExecutionLog = {
    jobId: string;
    status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
    email: string;
    createdAt: string;
    updatedAt: string;
    durationSec: number;
    typeNames: string[];
    processNames: string[];
};

export interface PaginationInfo {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface LogsResponse {
    items: ExecutionLog[];
    pagination: PaginationInfo;
}

export interface GetLogsParams {
    page?: number;
    limit?: number;
    search?: string;
    filters?: ExecutionLogFilterConditions;
}
// 2. 取得パラメータの型
export interface GetLogsParams {
    page?: number;
    limit?: number;
}

// 3. サービス関数の実装
export const logsService = {
    /**
     * 実行履歴一覧を取得
     */
    getExecutionLogs: async (params: GetLogsParams): Promise<LogsResponse> => {
        const { data } = await api.get<LogsResponse>(ENDPOINTS.LOGS.EXECUTION, {
            params: {
                page: params.page || 1,
                limit: params.limit || 30,
            }
        });
        return data;
    },

    // 将来的にここへ getAccessLogs などを追加可能
};