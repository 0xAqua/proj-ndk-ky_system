import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client.ts";
import { ENDPOINTS } from "@/lib/endpoints";
import { useMemo } from "react";

export type JobStatus = "LOADING" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type UseJobResultOptions = {
    jobId?: string;
    intervalMs?: number;
    maxRetries?: number; // 無限ポーリング防止
};

type JobResponse = {
    status: JobStatus;
    reply?: any;
    errorMessage?: string;
};

// セキュリティ：Job ID の形式を検証（英数字と特定記号のみ）
const isValidJobId = (id: string) => /^[a-zA-Z0-9#_-]{20,128}$/.test(id);

export const useJobResult = ({ jobId, intervalMs = 3000, maxRetries = 100 }: UseJobResultOptions) => {

    // 1. セキュリティ: 不正なID形式の場合はクエリ自体を無効化
    const isEnabled = !!jobId && isValidJobId(jobId);

    const { data, isError, error: queryError} = useQuery({
        queryKey: ['jobResult', jobId],
        enabled: isEnabled,
        queryFn: async (): Promise<JobResponse> => {
            if (!jobId) throw new Error("No Job ID");
            const res = await api.get(ENDPOINTS.JOBS.DETAIL(jobId));

            let replyData = res.data.reply;
            // パフォーマンス：JSONパースはレンダリング毎ではなく、データ取得時（1回のみ）に行う
            if (res.data.status === "COMPLETED" && typeof replyData === "string") {
                try {
                    replyData = JSON.parse(replyData);
                } catch (e) {
                    console.error("Failed to parse reply JSON:", e);
                }
            }

            return {
                ...res.data,
                reply: replyData
            };
        },
        // 2. パフォーマンス：ポーリング制御の最適化
        refetchInterval: (query) => {
            const status = query.state.data?.status;

            // 完了または失敗なら停止
            if (status === "COMPLETED" || status === "FAILED") return false;

            // パフォーマンス：リトライ上限に達したら停止（ゾンビプロセス防止）
            const fetchCount = query.state.fetchFailureCount + (query.state.data ? 1 : 0);
            if (fetchCount > maxRetries) return false;

            return intervalMs;
        },
        // 3. パフォーマンス：完了データは不変（Immutable）として扱う
        staleTime: (data) => (data?.state.data?.status === "COMPLETED" ? Infinity : 0),
        gcTime: 1000 * 60 * 30, // 30分間はキャッシュ保持
        refetchOnWindowFocus: false,
        retry: 1, // 通信エラー自体のリトライは控えめに
    });

    // 4. 認可・状態の正規化
    const status: JobStatus = data?.status || (isEnabled ? "LOADING" : "FAILED");

    const error = useMemo(() => {
        if (!isEnabled && jobId) return "不正なジョブIDです。";
        if (isError) return (queryError as Error).message;
        if (data?.status === "FAILED") return data.errorMessage || "解析に失敗しました。";
        return null;
    }, [isEnabled, jobId, isError, queryError, data]);

    const result = data?.status === "COMPLETED" ? data.reply : null;
    const isLoading = status === "LOADING" || status === "PENDING" || status === "PROCESSING";

    return {
        status,
        result,
        error,
        isLoading,
    };
};