// src/features/entry/hooks/useConstructionMaster.ts

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

export type ConstructionTask = { id: string; title: string; };
export type SafetyEquipment = { id: string; title: string; is_high_risk: boolean; };

export type ProcessCategory = {
    id: string;
    name: string;
    processes: {
        id: string;
        label: string;
        tasks: ConstructionTask[];
        safety_equipments: SafetyEquipment[];
    }[];
    children?: ProcessCategory[];
};

// --- API取得関数 ---
// コンポーネントの外に定義することで、余計な再生成を防ぎます
export const fetchConstructionMaster = async () => {
    const res = await api.get('/construction-master');
    return res.data;
};

export const useConstructionMaster = () => {
    const { departments } = useUserStore();

    // --- 1. React Queryによるデータ取得 ---
    // 初回はAPIを叩きますが、2回目以降はキャッシュを使います
    const { data: rawTree, isLoading, isError, error } = useQuery({
        queryKey: ['constructionMaster'], // キャッシュのキー
        queryFn: fetchConstructionMaster, // 実行する関数
        staleTime: 1000 * 60 * 60,        // 1時間はデータを「最新」とみなす（再フェッチしない）
        retry: 2,                         // 失敗時は2回まで自動リトライ
        refetchOnWindowFocus: false,      // ウィンドウフォーカス時の再取得を無効化（入力画面なら不要なことが多い）
    });

    // --- 2. データ整形ロジック (useMemoでメモ化) ---
    // データ(rawTree) または 部署(departments) が変わった時だけ計算が走ります
    const { constructions, environments } = useMemo(() => {
        // データがまだ無い、または部署情報が無い場合は空を返す
        if (!rawTree || departments.length === 0) {
            return { constructions: [], environments: [] };
        }

        const myDeptNames = departments.map(d => d.name);
        const tempConstructions: ProcessCategory[] = [];
        const tempEnvironments: ProcessCategory[] = [];

        rawTree.forEach((rootNode: any) => {
            // A. 環境系データ (IDが ENV で始まる)
            if (rootNode.id.startsWith("ENV")) {
                const envCategory: ProcessCategory = {
                    id: rootNode.id,
                    name: rootNode.title,
                    processes: [],
                    children: rootNode.children?.map((mid: any) => ({
                        id: mid.id,
                        name: mid.title,
                        processes: mid.children?.map((item: any) => ({
                            id: item.id,
                            label: item.title,
                            tasks: [],
                            safety_equipments: []
                        })) || []
                    })) || []
                };
                tempEnvironments.push(envCategory);
                return;
            }

            // B. 工事系データ (部署フィルタリングあり)
            if (myDeptNames.includes(rootNode.title)) {
                rootNode.children?.forEach((typeNode: any) => {
                    const processes = typeNode.children?.map((projNode: any) => ({
                        id: projNode.id,
                        label: projNode.title,
                        tasks: projNode.tasks || [],
                        safety_equipments: projNode.safety_equipments || []
                    })) || [];

                    if (processes.length > 0) {
                        tempConstructions.push({
                            id: typeNode.id,
                            name: typeNode.title,
                            processes: processes
                        });
                    }
                });
            }
        });

        return { constructions: tempConstructions, environments: tempEnvironments };

    }, [rawTree, departments]); // 依存配列: これらが変わった時のみ再計算

    return {
        constructions,
        environments,
        isLoading,
        // React QueryのエラーはError型なのでメッセージを取り出す、なければnull
        error: isError ? (error as Error).message : null,
    };
};