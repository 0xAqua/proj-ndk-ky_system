// src/features/entry/hooks/useConstructionMaster.ts

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

// 型定義 (ProcessCategory を再利用しますが、環境用としても使えます)
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
    // ★追加: 環境データ用の階層保持のため children も持てるようにしておく
    children?: ProcessCategory[];
};

export const useConstructionMaster = () => {
    const { departments } = useUserStore();

    // ★変更: 2つのカテゴリに分けて管理
    const [constructions, setConstructions] = useState<ProcessCategory[]>([]);
    const [environments, setEnvironments] = useState<ProcessCategory[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (departments.length === 0) return;

        const fetchMaster = async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/construction-master');
                const rawTree = res.data;

                const myDeptNames = departments.map(d => d.name);

                const tempConstructions: ProcessCategory[] = [];
                const tempEnvironments: ProcessCategory[] = [];

                rawTree.forEach((rootNode: any) => {
                    // A. 環境系データ (IDが ENV で始まる)
                    if (rootNode.id.startsWith("ENV")) {
                        // 環境データはそのままの構造で保存（中項目の階層などを維持するため整形ロジックは用途によるが、一旦そのままマッピング）
                        // ここでは、UI側で使いやすいように階層を整えます
                        const envCategory: ProcessCategory = {
                            id: rootNode.id,
                            name: rootNode.title,
                            processes: [], // 環境系はprocessesを使わないが型合わせのため
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

                setConstructions(tempConstructions);
                setEnvironments(tempEnvironments);

            } catch (err) {
                console.error("マスタデータの取得に失敗しました:", err);
                setError("マスタデータの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMaster();
    }, [departments]);

    // 戻り値を分ける
    return { constructions, environments, isLoading, error };
};