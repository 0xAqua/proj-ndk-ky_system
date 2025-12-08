import { useMemo } from "react";
import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

type UseSiteConditionConfirmDataProps = {
    open: boolean;
    constructions: ProcessCategory[];
    masterEnvironments: ProcessCategory[];
    selectedTypeIds: string[];
    selectedProcessIds: string[];
    selectedEnvIds: string[];
};

export const useSiteConditionConfirmData = ({
                                                open,
                                                constructions,
                                                masterEnvironments,
                                                selectedTypeIds,
                                                selectedProcessIds,
                                                selectedEnvIds,
                                            }: UseSiteConditionConfirmDataProps) => {

    // 1. ID参照用マップの作成 (O(N))
    const idToNameMap = useMemo(() => {
        const map = new Map<string, string>();
        const traverse = (categories: ProcessCategory[]) => {
            if (!categories) return;
            categories.forEach(cat => {
                map.set(cat.id, cat.name);
                if (cat.processes) {
                    cat.processes.forEach(proc => map.set(proc.id, proc.label));
                }
                if (cat.children) traverse(cat.children);
            });
        };
        traverse(constructions);
        return map;
    }, [constructions]);

    // 2. 工事種別名
    const typeNames = useMemo(() => {
        return selectedTypeIds
            .map(id => idToNameMap.get(id))
            .filter((name): name is string => name !== undefined);
    }, [selectedTypeIds, idToNameMap]);

    // 3. 工程名
    const processNames = useMemo(() => {
        return selectedProcessIds
            .map(id => idToNameMap.get(id))
            .filter((name): name is string => name !== undefined);
    }, [selectedProcessIds, idToNameMap]);

    // 4. 現場状況の表示データ作成
    const envItemsDisplay = useMemo(() => {
        if (!open) return []; // 閉じているときは計算しない

        const results: { categoryName: string; label: string }[] = [];
        const traverse = (categories: ProcessCategory[], parentNames: string[] = []) => {
            if (!categories) return;
            categories.forEach(cat => {
                if (cat.processes) {
                    const selectedProcesses = cat.processes.filter(p => selectedEnvIds.includes(p.id));
                    selectedProcesses.forEach(proc => {
                        results.push({
                            categoryName: parentNames.concat(cat.name).join(" > "),
                            label: proc.label
                        });
                    });
                }
                if (cat.children) {
                    traverse(cat.children, [...parentNames, cat.name]);
                }
            });
        };
        traverse(masterEnvironments);
        return results;
    }, [masterEnvironments, selectedEnvIds, open]);

    return {
        typeNames,
        processNames,
        envItemsDisplay,
    };
};