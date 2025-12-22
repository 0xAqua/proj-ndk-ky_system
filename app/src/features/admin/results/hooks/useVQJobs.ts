import { useState, useEffect } from "react";
import { api } from "@/lib/client.ts";
import { ENDPOINTS } from "@/lib/endpoints";

export interface VQJobListItem {
    job_id: string;
    created_at: number;

    family_name?: string;
    given_name?: string;

    type_names: string[];

    fact_incident_count: number;
    ai_incident_count: number;
}

interface VQJobsResponse {
    jobs: VQJobListItem[];
    last_evaluated_key?: string;
}

export const useVQJobs = () => {
    const [jobs, setJobs] = useState<VQJobListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = async (isLoadMore: boolean = false) => {
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            const params: Record<string, string> = { limit: "50" };
            if (isLoadMore && lastKey) params.last_evaluated_key = lastKey;

            const response = await api.get<VQJobsResponse>(ENDPOINTS.VQ_JOBS.LIST, { params });
            const data = response.data;

            const sorted = [...data.jobs].sort((a, b) => b.created_at - a.created_at);

            if (isLoadMore) {
                setJobs((prev) => {
                    const merged = [...prev, ...sorted];
                    const seen = new Set<string>();
                    const uniq: VQJobListItem[] = [];
                    for (const j of merged) {
                        if (!j?.job_id) continue;
                        if (seen.has(j.job_id)) continue;
                        seen.add(j.job_id);
                        uniq.push(j);
                    }
                    uniq.sort((a, b) => b.created_at - a.created_at);
                    return uniq;
                });
            } else {
                setJobs(sorted);
            }

            setLastKey(data.last_evaluated_key || null);
            setHasMore(!!data.last_evaluated_key);
        } catch (err) {
            let errorMessage = "データの取得に失敗しました";

            if (err instanceof Error) errorMessage = err.message;

            if ((err as any).response) {
                const status = (err as any).response.status;
                const data = (err as any).response.data;

                if (status === 401) errorMessage = "認証エラー: ログインし直してください";
                else if (status === 403) errorMessage = "アクセス権限がありません";
                else if (data?.message) errorMessage = data.message;
                else errorMessage = `エラー (${status}): ${(err as any).response.statusText}`;
            }

            setError(errorMessage);
            console.error("Error fetching jobs:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (hasMore && !loading) void fetchJobs(true);
    };

    const refresh = () => {
        setJobs([]);
        setLastKey(null);
        setHasMore(true);
        void fetchJobs(false);
    };

    useEffect(() => {
        void fetchJobs(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { jobs, loading, hasMore, error, loadMore, refresh };
};
