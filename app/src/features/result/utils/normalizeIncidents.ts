import type { CountermeasureData, IncidentData, RawIncident } from "@/features/result/types";

export const normalizeIncidents = (result: RawIncident[]): IncidentData[] =>
    result.map((raw, index) => {
        // "過去に起きたインシデント" → past, それ以外 → ai
        const badgeType: "past" | "ai" =
            raw.classification?.includes("過去") ? "past" : "ai";

        const borderColor =
            badgeType === "past" ? "blue.500" : "red.500";

        const countermeasures: CountermeasureData[] =
            raw.countermeasures.map((cm) => ({
                title: cm.title,
                purpose: undefined,
                content: cm.description,
                implementers: cm.responsible ? [cm.responsible] : [],
            }));

        return {
            id: `case-${raw.id ?? index}`,
            caseNumber: `Case${raw.id ?? index + 1}`,
            title: raw.title,
            description: raw.summary,
            badgeType,
            borderColor,
            countermeasures,
        };
    });