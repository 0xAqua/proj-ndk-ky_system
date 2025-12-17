import type { User } from "@/features/admin/users/types/types";

const ROLE_PRIORITY = ["admin", "user"] as const;

export const sortUsersByRole = (users: User[]): User[] => {
    return [...users].sort((a, b) => {
        const aIndex = ROLE_PRIORITY.indexOf(a.role as any);
        const bIndex = ROLE_PRIORITY.indexOf(b.role as any);

        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
};