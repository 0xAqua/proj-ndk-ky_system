// src/features/entry/hooks/useConstructionMaster.ts

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

// UIコンポーネント(ConstructionProcess)が期待するデータ型
export type ProcessCategory = {
    id: string;    // 工事種別ID (例: DEPT#1#TYPE#1)
    name: string;  // 工事種別名
    processes: {
        id: string;    // 工程ID (例: ...#PROJ#1)
        label: string; // 工程名
    }[];
};

export const useConstructionMaster = () => {
    // 自分の部署情報をStoreから取得（フィルタリングの元情報）
    const { departments } = useUserStore();

    const [categories, setCategories] = useState<ProcessCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 部署情報がなければロードしない
        if (departments.length === 0) return;

        const fetchMaster = async () => {
            setIsLoading(true);
            try {
                // 1. APIからデータ(ツリー構造)を取得
                const res = await api.get('/construction-master');
                const rawTree = res.data;

                // 2. ★構造化とフィルタリングの実行★
                const myDeptIds = departments.map(d => d.id);
                const formattedCategories: ProcessCategory[] = [];

                rawTree.forEach((deptNode: any) => {
                    // 自分の部署IDと一致しないノードはスキップ (フィルタリング)
                    if (!myDeptIds.includes(deptNode.id)) return;

                    // 部署の下にある「工事種別 (Type)」をループ
                    deptNode.children?.forEach((typeNode: any) => {

                        // 工事工程 (Project) のリストを抽出
                        const processes = typeNode.children?.map((projNode: any) => ({
                            id: projNode.id,    // nodePath ID
                            label: projNode.name
                        })) || [];

                        // 工程がある場合のみ、アコーディオンのカテゴリとして追加
                        if (processes.length > 0) {
                            formattedCategories.push({
                                id: typeNode.id,
                                name: typeNode.name,
                                processes: processes
                            });
                        }
                    });
                });
                console.log("Formatted Categories:", formattedCategories);
                setCategories(formattedCategories);

            } catch (err) {
                console.error("マスタデータの取得に失敗しました:", err);
                setError("マスタデータの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMaster();
    }, [departments]); // 部署情報が変わったら再実行

    // 画面側はこれをそのまま受け取る
    return { categories, isLoading, error };
};