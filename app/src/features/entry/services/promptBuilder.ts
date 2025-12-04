import type { ProcessCategory } from "@/features/entry/hooks/useConstructionMaster";

type PromptInput = {
    date: string;
    // マスタデータ (名前解決用)
    constructions: ProcessCategory[];
    environments: ProcessCategory[];
    // 選択されたID
    selectedTypeIds: string[];
    selectedProcessIds: string[];
    selectedEnvIds: string[];
};

export const buildConstructionPrompt = ({
                                            date,
                                            constructions,
                                            environments,
                                            selectedTypeIds,
                                            selectedProcessIds,
                                            selectedEnvIds
                                        }: PromptInput): string => {

    // ──────────────────────────────────────────
    // 1. 画面の入力内容をテキスト化する
    // ──────────────────────────────────────────

    // 工事種別 (Type) の名前
    const typeNames = constructions
        .filter(cat => selectedTypeIds.includes(cat.id))
        .map(cat => cat.name);

    // 工程 (Process) と機材の詳細
    const selectedProcesses = constructions
        .flatMap(cat => cat.processes)
        .filter(proc => selectedProcessIds.includes(proc.id));

    const processDetails = selectedProcesses.map(proc => {
        const equipments = proc.safety_equipments
            .map(eq => eq.is_high_risk ? `★${eq.title}` : eq.title)
            .join(", ");
        return `・${proc.label} (使用機材: ${equipments || "なし"})`;
    });

    // 現場環境 (Environment) の名前
    const selectedEnvNames: string[] = [];
    environments.forEach(large => {
        large.children?.forEach(mid => {
            mid.processes.forEach(item => {
                if (selectedEnvIds.includes(item.id)) {
                    selectedEnvNames.push(`・${large.name} > ${mid.name} > ${item.label}`);
                }
            });
        });
    });

    // ──────────────────────────────────────────
    // 2. プロンプトの組み立て
    // ──────────────────────────────────────────

    // 入力データ部分
    const contextPart = `
# 対象となる工事作業内容
以下の作業条件に基づき、危険予知（KY）のためのインシデント事例を生成してください。

## 1. 作業日時
${date}

## 2. 工事種別
${typeNames.length > 0 ? typeNames.join(", ") : "(指定なし)"}

## 3. 実施工程・使用機材
${processDetails.length > 0 ? processDetails.join("\n") : "(指定なし)"}

## 4. 現場状況・環境条件
${selectedEnvNames.length > 0 ? selectedEnvNames.join("\n") : "(特記事項なし)"}
`;

    // ルール・出力形式部分 (ご指定のテキスト)
    const rulesPart = `
## ルール
* データ構造：JSON
* 出力形式：
　* 回答は挨拶や解説などは一切含まない。
　* 出力は必ず有効なJSONでなければならない。
* インシデント構成：
　* **合計3件**のインシデントオブジェクトを生成してください。
　* 過去に実際に起きたインシデントは、類似の過去事例をベースとし、\`"type": "Fact"\` と設定してください。
　* AIが推測するオリジナル事例は、\`"type": "AI"\` と設定してください。
* データ要件：
　* 各インシデントには、必ず**3つの具体的な対応策**を \`countermeasures\` 配列に含めてください。
　* \`description\` には、「気をつける」のような抽象的な表現を避け、**現場で実践できる具体的な行動**を記述してください。
　* \`assignees\` 配列には、「現場責任者」「クレーンオペレーター」のように、**具体的な役割や役職名**を記述してください。

# JSONデータ構造

以下のオブジェクト構造に厳密に従ってください。

\`\`\`json
[
  {
    "caseNo": 1,
    "caseTitle": "（文字列）インシデントのタイトル",
    "type": "（文字列）\"Fact\" または \"AI\"",
    "overview": "（文字列）インシデントの具体的な状況説明",
    "countermeasures": [
      {
        "id": 1,
        "title": "（文字列）対応策のタイトル",
        "description": "（文字列）対応策の具体的な手順や内容",
        "assignees": [
          "（文字列）役割や役職名1",
          "（文字列）役割や役職名2"
        ]
      },
      {
        "id": 2,
        "title": "（文字列）対応策のタイトル",
        "description": "（文字列）対応策の具体的な手順や内容",
        "assignees": [
          "（文字列）役割や役職名"
        ]
      },
      {
        "id": 3,
        "title": "（文字列）対応策のタイトル",
        "description": "（文字列）対応策の具体的な手順や内容",
        "assignees": [
          "（文字列）役割や役職名"
        ]
      }
    ]
  },
  {
    "caseNo": 2,
    "caseTitle": "...",
    "type": "...",
    "overview": "...",
    "countermeasures": [...]
  },
  {
    "caseNo": 3,
    "caseTitle": "...",
    "type": "...",
    "overview": "...",
    "countermeasures": [...]
  }
]
\`\`\`
`;

    return (contextPart + "\n" + rulesPart).trim();
};