/**
 * 危険予知（KY）活動のインシデント生成プロンプト用テンプレート
 * (数値を可変に対応したバージョン)
 */

type PromptConfig = {
    totalIncidents: number;       // 合計インシデント数
    factIncidents: number;        // そのうち過去事例の数
    countermeasuresPerCase: number; // 1件あたりの対応策数
};

// 設定値を受け取ってルールテキストを返す関数
export const getConstructionPromptRules = ({
                                               totalIncidents,
                                               factIncidents,
                                               countermeasuresPerCase
                                           }: PromptConfig) => `
###出力形式
##内容
・類似状況のインシデントがない場合、推測できるインシデントとその対応策を記載
・登録されているドキュメントと同様インシデントについては（過去に起きたインシデント）と記載
・インシデントは合計${totalIncidents}つ出力を行う
・出力するインシデントの中で同様のインシデントは${factIncidents}つ
・１つのインシデントに対して対応策を${countermeasuresPerCase}つ記載
・対応策は誰が実施すべきか、を明確にする
・対応策は実際の作業でどのように実施するかを具体的に記載
・対応策は実際の作業時に行えるものを記載する
##出力
・出力形式はJSONのみ
・説明文、補足文、Markdownは禁止
・以下のフォーマットに完全準拠すること
・キーの追加、削除、変更は禁止
・各キーは以下の内容のみを記載してください。
#各キーの設定
title：
・インシデントの内容が一目で分かる短いタイトル（30文字程度）
classification：
・以下のいずれかのみを使用
　- 過去に起きたインシデント
　- 推測されるインシデント
summary：
・概要を2～3文で簡潔に記載
cause：
・原因を1～2文で記載（手順・確認不足・環境要因など）
countermeasures[].title：
・対応策の要点を簡潔に記載
countermeasures[].description：
・実際の作業でどのように実施するかを具体的に記載
countermeasures[].responsible：
・個人名ではなく役割で記載

#JSONフォーマット
{
  "incidents": [
    {
      "id": 1,
      "title": "",
      "classification": "過去に起きたインシデント | 推測されるインシデント",
      "summary": "",
      "cause": "",
      "countermeasures": [
        ${generateCountermeasureTemplate(countermeasuresPerCase)}
      ]
    }
  ]
}
`;

// JSONテンプレート内の対応策オブジェクトを繰り返し生成するヘルパー
const generateCountermeasureTemplate = (count: number) => {
    return Array.from({ length: count }, (_, i) => `
        {
          "no": ${i + 1},
          "title": "",
          "description": "",
          "responsible": ""
        }`).join(",");
};

// プロンプトの前半部分（動的な入力コンテキスト）
export const generateContextPart = (
    constructionSummary: string,
    todayWork: string,
    equipments: string, // ★追加: 機材を受け取る引数
    siteSituations: string
): string => {
    return `
以下の条件をもとに、類似状況で起こった過去のインシデントとその対応策を教えてください。
###条件
##実施する工事について
#工事概要
${constructionSummary}
#本日の工事
${todayWork}
#使用機材
${equipments}

##現場の状況について
#危険が予測される現場状況
${siteSituations}
`;
};