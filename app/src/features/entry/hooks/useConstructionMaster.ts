import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth"; // useUserStoreではなくuseAuthを使う
import { constructionService } from "@/lib/service/construction";

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

export const useConstructionMaster = () => {
    const { user } = useAuth();

    const myDeptNames = useMemo(() => {
        // snake_case と camelCase 両方をチェックする安全なアクセス
        const depts = user?.tenant_user?.departments || user?.tenantUser?.departments;

        if (!depts) {return [];
        }

        const values = Object.values(depts);
        return values;
    }, [user]);

    const { data: rawTree, isLoading, isError, error } = useQuery({
        queryKey: ['constructionMaster'],
        queryFn: constructionService.getMaster,
        staleTime: 1000 * 60 * 60,
        placeholderData: (previousData) => previousData,
    });

    // 4. データ整形ロジック
    const { constructions, environments } = useMemo(() => {
        // 部署名が取得できていない、またはマスタデータがない場合は空を返す
        if (!rawTree || myDeptNames.length === 0) {
            return { constructions: [], environments: [] };
        }

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

            // B. 工事系データ：APIの rootNode.title (例: 'ネットワーク') が
            // 自分の所属部署名 (myDeptNames) に含まれているかチェック
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

    }, [rawTree, myDeptNames]); // 依存配列に myDeptNames を指定

    return {
        constructions,
        environments,
        isLoading,
        error: isError ? (error as Error).message : null,
    };
};