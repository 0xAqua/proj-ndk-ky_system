// src/hooks/useConstructionMaster.ts
import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

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

/**
 * 統合版初期化APIから返された工事マスタデータを、
 * アプリケーションのUI構造（ProcessCategory型）に整形するフック
 */
export const useConstructionMaster = () => {
    // 1. 統合されたマスタデータを useAuth から直接取得
    // すでにバックエンドで部署フィルタリング済みのツリーが降ってきます
    const { constructionMaster, isLoading, error } = useAuth();

    // 2. データ整形ロジック
    const { constructions, environments } = useMemo(() => {
        if (!constructionMaster) {
            return { constructions: [], environments: [] };
        }

        const tempConstructions: ProcessCategory[] = [];
        const tempEnvironments: ProcessCategory[] = [];


        constructionMaster.forEach((node: any) => {
            // A. 環境系データ (IDが ENV で始まる場合)
            if (node.id.startsWith("ENV")) {
                tempEnvironments.push({
                    id: node.id,
                    name: node.title,
                    processes: [],
                    children: node.children?.map((mid: any) => ({
                        id: mid.id,
                        name: mid.title,
                        processes: mid.children?.map((item: any) => ({
                            id: item.id,
                            label: item.title,
                            tasks: item.tasks || [],
                            safety_equipments: item.safety_equipments || []
                        })) || []
                    })) || []
                });
                return;
            }

            // B. 工事系データ
            // バックエンドで部署ごとにツリー化されているため、
            // ルートノード（部署名）の直下にある「工種(typeNode)」をカテゴリとして扱う
            node.children?.forEach((typeNode: any) => {
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
        });

        return { constructions: tempConstructions, environments: tempEnvironments };

    }, [constructionMaster]);

    return {
        constructions,
        environments,
        isLoading,
        error,
    };
};