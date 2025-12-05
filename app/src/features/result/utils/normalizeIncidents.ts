import type {CountermeasureData, IncidentData, RawIncident} from "@/features/result/types";

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
