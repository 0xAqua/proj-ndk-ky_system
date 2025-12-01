import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/useUserStore";

// 画面表示用に抽出したデータ型
export type ConstructionType = {
    id: string;       // 例: "NETWORK#TYPE#1"
    name: string;     // 例: "舗装工事"
    deptName: string; // 例: "ネットワーク事業部"
};

export const useConstructionMaster = () => {
    const { departments } = useUserStore(); // 自分の部署 (例: [{id: "NETWORK", name: "..."}])
    const [types, setTypes] = useState<ConstructionType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 部署情報がなければ何もしない
        if (departments.length === 0) return;

        const fetchMaster = async () => {
            setIsLoading(true);
            try {
                // 1. テナントの全マスタデータを取得
                const res = await api.get('/construction-master');
                const rawTree = res.data; // ツリー構造の配列

                // 2. 自分の部署に紐づく「工事種別 (Type)」だけを抽出
                const myDeptIds = departments.map(d => d.id); // ["COMMON", "NETWORK"]
                const extractedTypes: ConstructionType[] = [];

                rawTree.forEach((deptNode: any) => {
                    // ルートノード(部署)のIDが、自分の部署リストにあるかチェック
                    // ※ データ投入スクリプトで nodePath="NETWORK" のように入れている前提
                    if (myDeptIds.includes(deptNode.id)) {

                        // その配下にある "ConstructionType" (children) を全て取り出す
                        deptNode.children?.forEach((typeNode: any) => {
                            extractedTypes.push({
                                id: typeNode.id,
                                name: typeNode.name,
                                deptName: deptNode.name
                            });
                        });
                    }
                });

                setTypes(extractedTypes);

            } catch (err) {
                console.error(err);
                setError("マスタデータの取得に失敗しました");
            } finally {
                setIsLoading(false);
            }
        };

        void fetchMaster();
    }, [departments]);

    return { types, isLoading, error };
};