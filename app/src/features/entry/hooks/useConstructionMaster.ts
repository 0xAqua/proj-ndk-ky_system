import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

// UIコンポーネントが期待するデータ型（最終構造）
export type ProcessCategory = {
    id: string;    // 工事種別ID (ConstructionType)
    name: string;  // 工事種別名
    processes: {
        id: string;    // 工程ID (ConstructionProject)
        label: string; // 工程名
    }[];
};

export const useConstructionMaster = () => {
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

                // 2. ★構造化とフィルタリングの実行★ (Hooksの責務)
                const myDeptIds = departments.map(d => d.id);
                const formattedCategories: ProcessCategory[] = [];

                rawTree.forEach((deptNode: any) => {
                    // 部署IDが一致しないノードはスキップ (フィルタリング)
                    if (!myDeptIds.includes(deptNode.id)) return;

                    // 部署の下にある「工事種別 (Type)」をループ
                    deptNode.children?.forEach((typeNode: any) => {

                        // その下の「工程 (Project)」を抽出してリスト化
                        // Project/Taskノードのみを対象とする (機材を排除)
                        const processes = typeNode.children
                            ?.filter((childNode: any) =>
                                childNode.type === 'ConstructionProject' || childNode.type === 'Task'
                            )
                            .map((projNode: any) => ({
                                id: projNode.id,    // nodePath IDを使用
                                label: projNode.name
                            })) || [];

                        // 工程がある場合のみ、カテゴリとして追加
                        if (processes.length > 0) {
                            formattedCategories.push({
                                id: typeNode.id,
                                name: typeNode.name,
                                processes: processes
                            });
                        }
                    });
                });

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