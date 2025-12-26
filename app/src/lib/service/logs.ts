import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';
import type { ExecutionLogFilterConditions } from '@/features/admin/logs/components/execution/ExecutionLogsFilterModal';
import type { AccessLogFilterConditions } from '@/features/admin/logs/components/access/AccessLogsFilterModal';

// ─────────────────────────────
// 実行履歴
// ─────────────────────────────
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

// ─────────────────────────────
// アクセス履歴（追加）
// ─────────────────────────────
export type AccessLog = {
    email: string;
    eventType: string;      // SignIn, SignIn_Failure, TokenRefresh
    result: string;         // Pass, Fail
    ipAddress: string;
    city: string;
    country: string;
    riskLevel: string;      // LOW, MEDIUM, HIGH
    createdAt: string;
};

// ─────────────────────────────
// 共通
// ─────────────────────────────
export interface PaginationInfo {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ExecutionLogsResponse {
    items: ExecutionLog[];
    pagination: PaginationInfo;
}

export interface AccessLogsResponse {
    items: AccessLog[];
    pagination: PaginationInfo;
}

export interface GetExecutionLogsParams {
    page?: number;
    limit?: number;
    search?: string;
    filters?: ExecutionLogFilterConditions;
}

export interface GetAccessLogsParams {
    page?: number;
    limit?: number;
    search?: string;
    filters?: AccessLogFilterConditions;
}

// ─────────────────────────────
// サービス関数
// ─────────────────────────────
export const logsService = {
    /**
     * 実行履歴一覧を取得
     */
    getExecutionLogs: async (params: GetExecutionLogsParams): Promise<ExecutionLogsResponse> => {
        const { data } = await api.get<ExecutionLogsResponse>(ENDPOINTS.LOGS.EXECUTION, {
            params: {
                page: params.page || 1,
                limit: params.limit || 30,
                search: params.search || undefined,
                startDate: params.filters?.startDate || undefined,
                endDate: params.filters?.endDate || undefined,
                status: params.filters?.status?.join(',') || undefined,
                jobName: params.filters?.jobName || undefined,
            }
        });
        return data;
    },

    /**
     * アクセス履歴一覧を取得（追加）
     */
    getAccessLogs: async (params: GetAccessLogsParams): Promise<AccessLogsResponse> => {
        const { data } = await api.get<AccessLogsResponse>(ENDPOINTS.LOGS.ACCESS, {
            params: {
                page: params.page || 1,
                limit: params.limit || 30,
                search: params.search || undefined,
                startDate: params.filters?.startDate || undefined,
                endDate: params.filters?.endDate || undefined,
                ipAddress: params.filters?.ipAddress || undefined,
            }
        });
        return data;
    },
};