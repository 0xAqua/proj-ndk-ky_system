import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";
import {
    getConstructionPromptRules,
    generateContextPart
} from "@/features/entry/constants/promptTemplates";

// ▼ ここで数を変更できます
const PROMPT_CONFIG = {
    totalIncidents: 3,        // 合計出力数
    factIncidents: 1,         // 同様のインシデント数
    countermeasuresPerCase: 3 // 対応策の数
};

type PromptInput = {
    date: string;
    constructions: ProcessCategory[];
    environments: ProcessCategory[];
    selectedTypeIds: string[];
    selectedProcessIds: string[];
    selectedEnvIds: string[];
};

export const buildConstructionPrompt = ({
                                            constructions,
                                            environments,
                                            selectedTypeIds,
                                            selectedProcessIds,
                                            selectedEnvIds
                                        }: PromptInput): string => {

    // ──────────────────────────────────────────
    // 1. データの加工処理（ロジック）
    // ──────────────────────────────────────────

    // 1. 工事種別 (Type) の名前リスト作成（概要・本日の工事用）
    const typeNames = constructions
        .filter(cat => selectedTypeIds.includes(cat.id))
        .map(cat => cat.name);

    // 2. 使用機材 (Equipment) のリスト作成
    // 選択されたProcessIDに基づいて、紐づく機材(safety_equipments)を抽出
    const selectedProcesses = constructions
        .flatMap(cat => cat.processes)
        .filter(proc => selectedProcessIds.includes(proc.id));

    // 機材名を配列化
    const allEquipments = selectedProcesses
        .flatMap(proc => proc.safety_equipments)
        .map(eq => eq.title);

    // 重複を削除して一意にする
    const uniqueEquipments = Array.from(new Set(allEquipments));

    // 3. 現場環境 (Environment) の名前リスト作成
    const selectedEnvNames: string[] = [];
    environments.forEach(large => {
        large.children?.forEach(mid => {
            mid.processes.forEach(item => {
                if (selectedEnvIds.includes(item.id)) {
                    // プロンプトの例に合わせて「-項目名」の形式にします
                    selectedEnvNames.push(`-${item.label}`);
                }
            });
        });
    });

    // ──────────────────────────────────────────
    // 2. 文字列への整形
    // ──────────────────────────────────────────

    const typeNamesStr = typeNames.length > 0
        ? typeNames.join("\n")
        : "(指定なし)";

    // 機材：もしあれば「-機材名」の形式で結合
    const equipmentsStr = uniqueEquipments.length > 0
        ? uniqueEquipments.map(name => `-${name}`).join("\n")
        : "(指定なし)";

    const envNamesStr = selectedEnvNames.length > 0
        ? selectedEnvNames.join("\n")
        : "(特記事項なし)";

    // ──────────────────────────────────────────
    // 3. プロンプトの結合
    // ──────────────────────────────────────────

    // コンテキスト部分
    const contextPart = generateContextPart(
        typeNamesStr,  // 工事概要
        typeNamesStr,  // 本日の工事
        equipmentsStr, // ★使用機材
        envNamesStr    // 現場状況
    );

    // ルール部分（設定値を渡して生成）
    const rulesPart = getConstructionPromptRules(PROMPT_CONFIG);

    return [contextPart, rulesPart].join("\n").trim();
};