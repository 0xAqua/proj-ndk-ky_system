// VQ API形式に対応
export interface RawCountermeasure {
    no: number;
    title: string;
    description: string;
    responsible: string;
}

export interface RawIncident {
    id: number;
    title: string;
    classification: string;  // "過去に起きたインシデント" | "推測されるインシデント"
    summary: string;
    cause: string;
    countermeasures: RawCountermeasure[];
}

// UI 用の型
export interface CountermeasureData {
    title: string;
    purpose?: string;
    content: string;
    implementers: string[];
}

export interface IncidentData {
    id: string;
    caseNumber: string;
    title: string;
    description: string;
    badgeType: "past" | "ai";
    borderColor: string;
    countermeasures: CountermeasureData[];
}