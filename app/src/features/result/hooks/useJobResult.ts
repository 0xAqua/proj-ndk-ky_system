import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client.ts";
import { ENDPOINTS } from "@/lib/endpoints";


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

type JobResponse = {
    status: JobStatus;
    reply?: any;
    errorMessage?: string;
};

export const useJobResult = ({ jobId, intervalMs = 3000 }: UseJobResultOptions) => {

    const { data, isError, error: queryError } = useQuery({
        // jobIdが変わるごとに別のキャッシュとして扱う
        queryKey: ['jobResult', jobId],

        // jobIdが無いときはクエリを実行しない
        enabled: !!jobId,

        // データ取得関数
        queryFn: async (): Promise<JobResponse> => {
            if (!jobId) throw new Error("No Job ID");
            const res = await api.get(ENDPOINTS.JOBS.DETAIL(jobId));
            return res.data;
        },

        // ★ポーリング制御の肝
        // ステータスが完了または失敗になるまで、intervalMs 間隔で再取得する
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === "COMPLETED" || status === "FAILED") {
                return false; // ポーリング停止
            }
            return intervalMs; // ポーリング継続
        },

        // ウィンドウフォーカス時の再取得は、ポーリング中なのでオフでも良い（お好みで）
        refetchOnWindowFocus: false,
    });

    // 結果の正規化（既存のインターフェースに合わせる）
    const status: JobStatus = data?.status || "LOADING";

    // エラーハンドリング
    const error = isError
        ? (queryError as Error).message
        : (data?.status === "FAILED" ? data.errorMessage || "ジョブが失敗しました" : null);

    // JSONパース処理
    let result = null;
    if (data?.status === "COMPLETED" && data.reply) {
        result = data.reply;
        // 二重JSON文字列対策
        if (typeof result === "string") {
            try {
                result = JSON.parse(result);
            } catch {
                // パース失敗ならそのまま使う
            }
        }
    }

    const isLoading = status === "LOADING" || status === "PENDING" || status === "PROCESSING";

    return {
        status,
        result,
        error,
        isLoading,
    };
};