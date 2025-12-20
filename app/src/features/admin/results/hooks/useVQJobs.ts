import { useState, useEffect } from 'react';
import { api } from '@/lib/client.ts';
import { ENDPOINTS } from '@/lib/endpoints';


// 最適化されたレスポンスに合わせた型定義
export interface VQJobIncident {
    id: number;
    title: string;
    summary: string;
    classification: string;  // "過去に起きたインシデント" | "推測されるインシデント"
}

export interface VQJob {
    job_id: string;
    created_at: number;
    incidents: VQJobIncident[];
}

interface VQJobsResponse {
    jobs: VQJob[];
    last_evaluated_key?: string;
}

export const useVQJobs = () => {
    const [jobs, setJobs] = useState<VQJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = async (isLoadMore: boolean = false) => {
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            const params: Record<string, string> = {
                limit: '50'
            };

            if (isLoadMore && lastKey) {
                params.last_evaluated_key = lastKey;
            }

            const response = await api.get<VQJobsResponse>(ENDPOINTS.VQ_JOBS.LIST, { params });

            const data = response.data;

            if (isLoadMore) {
                setJobs(prev => [...prev, ...data.jobs]);
            } else {
                setJobs(data.jobs);
            }

            setLastKey(data.last_evaluated_key || null);
            setHasMore(!!data.last_evaluated_key);
        } catch (err) {
            let errorMessage = 'データの取得に失敗しました';

            if (err instanceof Error) {
                errorMessage = err.message;
            }

            // axios error
            if ((err as any).response) {
                const status = (err as any).response.status;
                const data = (err as any).response.data;

                console.error('API Error:', {
                    status,
                    data,
                    headers: (err as any).response.headers
                });

                if (status === 401) {
                    errorMessage = '認証エラー: ログインし直してください';
                } else if (status === 403) {
                    errorMessage = 'アクセス権限がありません';
                } else if (data?.message) {
                    errorMessage = data.message;
                } else {
                    errorMessage = `エラー (${status}): ${(err as any).response.statusText}`;
                }
            }

            setError(errorMessage);
            console.error('Error fetching jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (hasMore && !loading) {
            void fetchJobs(true);
        }
    };

    const refresh = () => {
        setJobs([]);
        setLastKey(null);
        setHasMore(true);
        void fetchJobs(false);
    };

    // 初回読み込み
    useEffect(() => {
        void fetchJobs();
    }, []);

    return {
        jobs,
        loading,
        hasMore,
        error,
        loadMore,
        refresh
    };
};