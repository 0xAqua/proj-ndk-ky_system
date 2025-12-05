export interface RawCountermeasure {
    id: number;
    title: string;
    description: string;
    assignees: string[];
}

export interface RawIncident {
    caseNo: number;
    caseTitle: string;
    type: "Fact" | "AI" | string;
    overview: string;
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
