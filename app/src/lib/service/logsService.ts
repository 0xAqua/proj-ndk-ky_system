import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';
import type { ExecutionLogFilterConditions } from '@/features/admin/logs/components/execution/ExecutionLogsFilterModal';
import type { AccessLogFilterConditions } from '@/features/admin/logs/components/access/AccessLogsFilterModal';
import type { OperationLogFilterConditions } from '@/features/admin/logs/components/operation/OperationLogsFilterModal';  // ★ 追加

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
// アクセス履歴
// ─────────────────────────────
export type AccessLog = {
    email: string;
    eventType: string;
    result: string;
    ipAddress: string;
    city: string;
    country: string;
    riskLevel: string;
    createdAt: string;
};

// ─────────────────────────────
// 操作履歴（追加）
// ─────────────────────────────
export type OperationLog = {
    email: string;
    category: 'USER' | 'VQ' | 'CONFIG' | 'DATA';
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXECUTE';
    targetType: string;
    targetName: string;
    message: string;
    ipAddress: string;
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

// ★ 追加
export interface OperationLogsResponse {
    items: OperationLog[];
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

// ★ 追加
export interface GetOperationLogsParams {
    page?: number;
    limit?: number;
    search?: string;
    filters?: OperationLogFilterConditions;
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
     * アクセス履歴一覧を取得
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

    /**
     * 操作履歴一覧を取得（追加）
     */
    getOperationLogs: async (params: GetOperationLogsParams): Promise<OperationLogsResponse> => {
        const { data } = await api.get<OperationLogsResponse>(ENDPOINTS.LOGS.OPERATION, {
            params: {
                page: params.page || 1,
                limit: params.limit || 30,
                search: params.search || undefined,
                startDate: params.filters?.startDate || undefined,
                endDate: params.filters?.endDate || undefined,
                category: params.filters?.category?.join(',') || undefined,
                action: params.filters?.action?.join(',') || undefined,
            }
        });
        return data;
    },
};