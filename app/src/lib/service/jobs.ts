import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints';

export const jobsService = {
    list: async () => {
        const { data } = await api.get(ENDPOINTS.JOBS.LIST);
        return data;
    },

    get: async (id: string) => {
        const { data } = await api.get(ENDPOINTS.JOBS.DETAIL(id));
        return data;
    },
};