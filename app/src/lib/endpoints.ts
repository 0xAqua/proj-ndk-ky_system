export const ENDPOINTS = {
    AUTH: {
        LOGIN: '/bff/auth/login',
        LOGOUT: '/bff/auth/logout',
        SESSION: '/bff/auth/session',
        REFRESH: '/bff/auth/refresh',
    },
    AUTH_CONTEXT: '/auth-context',
    JOBS: {
        LIST: '/jobs',
        DETAIL: (id: string) => `/jobs/${id}`,
    },
    CONSTRUCTION: {
        MASTER: '/construction-master',
    },
    ADMIN: {
        USERS: {
            LIST: '/admin/users',
            DETAIL: (id: string) => `/admin/users/${id}`,
        },
    },
    VQ_JOBS: {
        LIST: '/vq-jobs',
        REPLY: (id: string) => `/vq-jobs/${id}/reply`,
    },
    LOGS: {
        EXECUTION: '/logs/execution',
        ACCESS: '/logs/access',
        OPERATION: '/logs/operation',
    },
} as const;