export const ENDPOINTS = {
    AUTH: {
        LOGIN: '/bff/auth/login',
        LOGOUT: '/bff/auth/logout',
        SESSION: '/bff/auth/session',
        REFRESH: '/bff/auth/refresh',
        VERIFY_OTP: '/bff/auth/verify-otp',
        RESEND_OTP: '/bff/auth/resend-otp',
        PASSKEY_OPTIONS: '/bff/auth/passkey/options',
        PASSKEY_VERIFY: '/bff/auth/passkey/verify',
        FORGOT_PASSWORD: '/bff/auth/forgot-password',
        RESET_PASSWORD: '/bff/auth/reset-password',
        PASSKEY_REGISTER_OPTIONS: '/bff/auth/passkey/register-options',
        PASSKEY_REGISTER_VERIFY: '/bff/auth/passkey/register-verify',
        PASSKEY_LOGIN: '/bff/auth/passkey/login',
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
    TENANT_CONFIG: {
        PROMPT: '/tenant-config/prompt',
        SECURITY: '/tenant-config/security',
    },
} as const;