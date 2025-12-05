// src/hooks/useJobResult.ts
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type JobStatus =
    | "LOADING"
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

type UseJobResultOptions = {
    jobId?: string;
    intervalMs?: number;
};

export const useJobResult = ({ jobId, intervalMs = 3000 }: UseJobResultOptions) => {
    const [status, setStatus] = useState<JobStatus>("LOADING");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) {
            setError("jobId が指定されていません");
            setStatus("FAILED");
            return;
        }

        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const fetchResult = async () => {
            try {
                const res = await api.get(`/jobs/${jobId}`);
                if (cancelled) return;

                const data = res.data;
                setStatus(data.status);

                if (data.status === "COMPLETED") {
                    let parsed: any = data.reply;
                    if (typeof parsed === "string") {
                        try {
                            parsed = JSON.parse(parsed);
                        } catch {
                            // パース失敗時はそのまま
                        }
                    }
                    setResult(parsed);
                    if (intervalId) clearInterval(intervalId);
                } else if (data.status === "FAILED") {
                    setError(data.errorMessage ?? "ジョブが失敗しました");
                    if (intervalId) clearInterval(intervalId);
                }
                // PENDING / PROCESSING の場合はポーリング継続
            } catch (e) {
                console.error("Failed to fetch result:", e);
                if (cancelled) return;
                setError("結果の取得に失敗しました");
                if (intervalId) clearInterval(intervalId);
            }
        };

        // リセット
        setStatus("LOADING");
        setResult(null);
        setError(null);

        // 初回実行
        void fetchResult();
        // ポーリング開始
        intervalId = setInterval(fetchResult, intervalMs);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [jobId, intervalMs]);

    const isLoading =
        status === "LOADING" || status === "PENDING" || status === "PROCESSING";

    return {
        status,
        result,
        error,
        isLoading,
    };
};
