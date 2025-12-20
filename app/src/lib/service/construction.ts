import { api } from '@/lib/client';
import { ENDPOINTS } from '@/lib/endpoints.ts';

export const constructionService = {
    getMaster: async () => {
        const { data } = await api.get(ENDPOINTS.CONSTRUCTION.MASTER);
        return data;
    },
};