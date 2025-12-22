import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { ENDPOINTS } from "@/lib/endpoints";

// reply の型（このhook内に置いてOK）
export type VQJobReply = {
    incidents: Incident[];
};

export type Incident = {
    id: number;
    title: string;
    classification: string;
    summary: string;
    cause: string;
    countermeasures: Countermeasure[];
};

export type Countermeasure = {
    no: number;
    title: string;
    description: string;
    responsible: string;
};

type Options = {
    /** jobId が変わってもキャッシュがあれば通信しない（デフォ true） */
    useCache?: boolean;
};

export const useVQJobReply = (jobId: string | null, options: Options = {}) => {
    const { useCache = true } = options;

    const [reply, setReply] = useState<VQJobReply | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // jobId -> reply の簡易キャッシュ
    const cacheRef = useRef<Map<string, VQJobReply>>(new Map());
    // 通信キャンセル用
    const abortRef = useRef<AbortController | null>(null);

    const fetchReply = async (force = false) => {
        if (!jobId) {
            setReply(null);
            setLoading(false);
            setError(null);
            return;
        }

        // キャッシュがあれば即返す
        if (!force && useCache) {
            const cached = cacheRef.current.get(jobId);
            if (cached) {
                setReply(cached);
                setError(null);
                return;
            }
        }

        // 進行中の通信を中断
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setLoading(true);
        setError(null);

        try {
            const res = await api.get<VQJobReply>(ENDPOINTS.VQ_JOBS.REPLY(jobId), {
                signal: ac.signal,
            });

            const data = res.data;
            cacheRef.current.set(jobId, data);
            setReply(data);
        } catch (e: any) {
            // Abort はエラー扱いにしない
            if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
            if (e?.name === "AbortError") return;

            setError(e?.message ?? "取得に失敗しました");
            setReply(null);
        } finally {
            setLoading(false);
        }
    };

    // jobId が変わったら取得
    useEffect(() => {
        fetchReply(false);

        return () => {
            abortRef.current?.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    return {
        reply,
        loading,
        error,
        refetch: () => fetchReply(true), // 強制再取得
        clearCache: () => {
            cacheRef.current.clear();
        },
    };
};
