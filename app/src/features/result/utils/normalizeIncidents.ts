// src/features/result/mappers/normalizeIncidents.ts

// API から返ってくるそのままの型
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

export const normalizeIncidents = (result: RawIncident[]): IncidentData[] =>
    result.map((raw, index) => {
        const badgeType: "past" | "ai" =
            raw.type === "Fact" ? "past" : "ai";

        const borderColor =
            badgeType === "past" ? "blue.500" : "red.500";

        const countermeasures: CountermeasureData[] =
            raw.countermeasures.map((cm) => ({
                title: cm.title,
                purpose: undefined,
                content: cm.description,
                implementers: cm.assignees ?? [],
            }));

        return {
            id: `case-${raw.caseNo ?? index}`,
            caseNumber: `Case${raw.caseNo ?? index + 1}`,
            title: raw.caseTitle,
            description: raw.overview,
            badgeType,
            borderColor,
            countermeasures,
        };
    });
