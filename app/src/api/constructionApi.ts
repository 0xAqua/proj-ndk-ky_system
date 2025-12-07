import {api} from "@/lib/api.ts";

export const fetchConstructionMaster = async () => {
    const res = await api.get('/construction-master');
    return res.data;
};
