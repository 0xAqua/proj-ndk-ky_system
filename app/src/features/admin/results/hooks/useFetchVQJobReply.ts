import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type CacheEntry = {
    data: VQJobReply;
    fetchedAt: number; // epoch ms
};

type Options = {
    /** キャッシュ利用（デフォ true） */
    useCache?: boolean;

    /**
     * staleTime: これ以内なら「新鮮」扱いで通信しない（デフォ 60秒）
     * - 例: API結果が頻繁に変わらないなら少し長めでもOK
     */
    staleTimeMs?: number;

    /**
     * cacheTime: これを超えたキャッシュは破棄（デフォ 10分）
     * - 例: job reply は履歴で再閲覧多いなら長めでもOK
     */
    cacheTimeMs?: number;

    /**
     * キャッシュが stale のとき、まずキャッシュを表示して裏で再取得する（SWR）
     * - デフォ true
     */
    revalidateIfStale?: boolean;

    /** リトライ回数（デフォ 2） */
    retry?: number;

    /** リトライのベース遅延（デフォ 300ms） */
    retryBaseDelayMs?: number;

    /** 最大リトライ遅延（デフォ 3000ms） */
    retryMaxDelayMs?: number;

    /** AbortSignal 以外に、クライアント側timeoutを設けたい場合（任意） */
    timeoutMs?: number;
};

const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => resolve(), ms);
        if (signal) {
            const onAbort = () => {
                clearTimeout(t);
                reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
            };
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
        }
    });

const parseRetryAfterMs = (value: unknown): number | null => {
    if (!value) return null;
    const v = String(value).trim();

    // Retry-After: seconds
    const sec = Number(v);
    if (!Number.isNaN(sec) && sec >= 0) return sec * 1000;

    // Retry-After: HTTP-date
    const t = Date.parse(v);
    if (!Number.isNaN(t)) {
        const diff = t - Date.now();
        return diff > 0 ? diff : 0;
    }

    return null;
};

const getHttpMeta = (e: any): { status?: number; headers?: Record<string, any> } => {
    // axios を想定（api が axios instance の場合）
    const status = e?.response?.status;
    const headers = e?.response?.headers;
    return { status, headers };
};

const isAbortError = (e: any) =>
    e?.name === "AbortError" || e?.name === "CanceledError" || e?.code === "ERR_CANCELED";

const isRetryable = (e: any) => {
    const { status } = getHttpMeta(e);
    // API Gateway / Lambda でありがちな一時エラー：429 / 5xx
    if (status === 429) return true;
    if (status && status >= 500 && status <= 599) return true;

    // ネットワーク系（axios の code 例: ECONNABORTED など）も一時扱い
    const code = e?.code;
    if (code && typeof code === "string") {
        if (["ECONNABORTED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return true;
    }

    // response がない系（ネットワーク断など）
    if (!e?.response) return true;

    return false;
};

const calcBackoffMs = (attempt: number, base: number, cap: number) => {
    // attempt: 0,1,2...（指数 + ジッタ）
    const exp = Math.min(cap, base * Math.pow(2, attempt));
    const jitter = Math.random() * 0.3 * exp; // 0〜30%ジッタ
    return Math.min(cap, exp + jitter);
};

export const useVQJobReply = (jobId: string | null, options: Options = {}) => {
    const {
        useCache = true,
        staleTimeMs = 60_000,
        cacheTimeMs = 10 * 60_000,
        revalidateIfStale = true,
        retry = 2,
        retryBaseDelayMs = 300,
        retryMaxDelayMs = 3_000,
        timeoutMs,
    } = options;

    const [reply, setReply] = useState<VQJobReply | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
    const inFlightRef = useRef<Map<string, Promise<VQJobReply>>>(new Map());
    const abortRef = useRef<AbortController | null>(null);

    // 古いレスポンスで state を上書きしない
    const requestSeqRef = useRef(0);

    const now = () => Date.now();

    const getCache = useCallback(
        (key: string) => {
            const ent = cacheRef.current.get(key);
            if (!ent) return null;

            const age = now() - ent.fetchedAt;

            // cacheTime を超えていたら破棄
            if (age > cacheTimeMs) {
                cacheRef.current.delete(key);
                return null;
            }

            return { entry: ent, age };
        },
        [cacheTimeMs]
    );

    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    const fetchFromApi = useCallback(
        async (key: string, signal: AbortSignal): Promise<VQJobReply> => {
            // in-flight dedupe
            const existing = inFlightRef.current.get(key);
            if (existing) return existing;

            const task = (async () => {
                let attempt = 0;
                // retry は「追加試行回数」ではなく「最大リトライ回数」として扱う（合計 = 1 + retry）
                while (true) {
                    if (signal.aborted) {
                        throw Object.assign(new Error("Aborted"), { name: "AbortError" });
                    }

                    try {
                        // 任意の timeout（axios の timeout と併用しない方が混乱少ないが、必要なら使う）
                        if (timeoutMs && timeoutMs > 0) {
                            // Promise.race でクライアントtimeout
                            const res = await Promise.race([
                                api.get<VQJobReply>(ENDPOINTS.VQ_JOBS.REPLY(key), { signal }),
                                (async () => {
                                    await sleep(timeoutMs, signal);
                                    const err = Object.assign(new Error("Request timeout"), { code: "ETIMEDOUT" });
                                    throw err;
                                })(),
                            ]);
                            return (res as any).data as VQJobReply;
                        }

                        const res = await api.get<VQJobReply>(ENDPOINTS.VQ_JOBS.REPLY(key), { signal });
                        return res.data;
                    } catch (e: any) {
                        if (isAbortError(e)) throw e;

                        const canRetry = isRetryable(e) && attempt < retry;
                        if (!canRetry) throw e;

                        const { headers, status } = getHttpMeta(e);

                        // 429 は Retry-After を尊重
                        const retryAfterMs =
                            status === 429 ? parseRetryAfterMs(headers?.["retry-after"] ?? headers?.["Retry-After"]) : null;

                        const waitMs =
                            retryAfterMs ?? calcBackoffMs(attempt, retryBaseDelayMs, retryMaxDelayMs);

                        attempt += 1;
                        await sleep(waitMs, signal);
                    }
                }
            })();

            inFlightRef.current.set(key, task);

            try {
                const data = await task;
                return data;
            } finally {
                inFlightRef.current.delete(key);
            }
        },
        [retry, retryBaseDelayMs, retryMaxDelayMs, timeoutMs]
    );

    const setCached = useCallback((key: string, data: VQJobReply) => {
        cacheRef.current.set(key, { data, fetchedAt: now() });
    }, []);

    const refetch = useCallback(async () => {
        if (!jobId) return;

        // 進行中の通信を中断して再取得
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const seq = ++requestSeqRef.current;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchFromApi(jobId, ac.signal);
            setCached(jobId, data);

            // 途中で別リクエストが走っていたら反映しない
            if (seq !== requestSeqRef.current) return;

            setReply(data);
        } catch (e: any) {
            if (isAbortError(e)) return;

            if (seq !== requestSeqRef.current) return;

            setError(e?.message ?? "取得に失敗しました");
            setReply(null);
        } finally {
            if (seq === requestSeqRef.current) setLoading(false);
        }
    }, [jobId, fetchFromApi, setCached]);

    const load = useCallback(
        async (key: string) => {
            // キャッシュを見る
            const cached = useCache ? getCache(key) : null;

            // 1) 新鮮ならそれで終了（通信しない）
            if (cached && cached.age <= staleTimeMs) {
                setReply(cached.entry.data);
                setError(null);
                setLoading(false);
                return;
            }

            // 2) stale だけどキャッシュがあるなら、まず表示して（SWR）裏で取りに行く
            if (cached && revalidateIfStale) {
                setReply(cached.entry.data);
                setError(null);
                // ここは「裏更新」なので loading は出したくないケースが多い（必要なら true に）
            } else {
                setReply(null);
            }

            // 進行中の通信を中断
            abortRef.current?.abort();
            const ac = new AbortController();
            abortRef.current = ac;

            const seq = ++requestSeqRef.current;

            // キャッシュ無し or SWRせず真面目ロードのときは loading を出す
            if (!cached || !revalidateIfStale) setLoading(true);
            setError(null);

            try {
                const data = await fetchFromApi(key, ac.signal);
                setCached(key, data);

                if (seq !== requestSeqRef.current) return;

                setReply(data);
            } catch (e: any) {
                if (isAbortError(e)) return;

                if (seq !== requestSeqRef.current) return;

                setError(e?.message ?? "取得に失敗しました");
                // SWR の場合、古いキャッシュが表示されているなら消さない方がUXは良い
                if (!cached) setReply(null);
            } finally {
                if (seq === requestSeqRef.current) setLoading(false);
            }
        },
        [fetchFromApi, getCache, revalidateIfStale, setCached, staleTimeMs, useCache]
    );

    // jobId が変わったら取得
    useEffect(() => {
        if (!jobId) {
            // unselected
            abortRef.current?.abort();
            requestSeqRef.current += 1;

            setReply(null);
            setLoading(false);
            setError(null);
            return;
        }

        void load(jobId);

        return () => {
            abortRef.current?.abort();
        };
    }, [jobId, load]);

    return useMemo(
        () => ({
            reply,
            loading,
            error,
            refetch, // 強制再取得
            clearCache,
        }),
        [reply, loading, error, refetch, clearCache]
    );
};
