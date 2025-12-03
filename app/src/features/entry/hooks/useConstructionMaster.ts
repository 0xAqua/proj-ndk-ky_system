import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

// ▼ 追加: 個別のタスク型
export type ConstructionTask = {
    id: string;
    title: string;
};

// ▼ 追加: 安全機材型
export type SafetyEquipment = {
    id: string;
    title: string;
    is_high_risk: boolean;
};

// UIコンポーネントが期待するデータ型（最終構造）
export type ProcessCategory = {
    id: string;    // 工事種別ID (例: DEPT#1#TYPE#1)
    name: string;  // 工事種別名 (例: 電柱・支線)
    processes: {
        id: string;    // 工程ID (例: DEPT#1#TYPE#1#PROJ#1)
        label: string; // 工程名 (例: 電柱新設)
        tasks: ConstructionTask[];            // ★追加
        safety_equipments: SafetyEquipment[]; // ★追加
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

                // 2. ★構造化とフィルタリングの実行★
                // ID("COMMON" vs "DEPT#1")が一致しない可能性があるため、
                // 今回は「部署名("共通")」でマッチングさせます
                const myDeptNames = departments.map(d => d.name); // ["共通", "ネットワーク", ...]

                const formattedCategories: ProcessCategory[] = [];

                rawTree.forEach((deptNode: any) => {
                    // 部署名が含まれていなければスキップ
                    if (!myDeptNames.includes(deptNode.title)) return;

                    // 部署の下にある「工事種別 (Type)」をループ
                    deptNode.children?.forEach((typeNode: any) => {

                        // その下の「工程 (Project)」をマッピング
                        // API(Lambda)側ですでに tasks/equipments が整理されている前提
                        const processes = typeNode.children?.map((projNode: any) => ({
                            id: projNode.id,
                            label: projNode.title,            // name ではなく title
                            tasks: projNode.tasks || [],      // 配列をそのまま渡す
                            safety_equipments: projNode.safety_equipments || []
                        })) || [];

                        // 工程がある場合のみ、カテゴリとして追加
                        if (processes.length > 0) {
                            formattedCategories.push({
                                id: typeNode.id,
                                name: typeNode.title,
                                processes: processes
                            });
                        }
                    });
                });

                console.log("Formatted Master Data:", formattedCategories);
                setCategories(formattedCategories);

            } catch (err) {
                console.error("マスタデータの取得に失敗しました:", err);
                setError("マスタデータの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMaster();
    }, [departments]);

    return { categories, isLoading, error };
};