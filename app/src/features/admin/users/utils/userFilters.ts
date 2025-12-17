// src/features/admin/users/utils/userFilters.ts

import type { User } from "@/features/admin/users/types/types";
import type { FilterConditions } from "@/features/admin/users/components/UserAdminFilterModal";

/**
 * ユーザーリストをフィルタリング＆ソートする
 */
export const filterAndSortUsers = (
    users: User[],
    searchText: string,
    filters: FilterConditions
): User[] => {
    // 1. フィルタリング
    let result = users.filter((user) => {
        // テキスト検索
        if (searchText) {
            const search = searchText.toLowerCase();
            const fullName = `${user.family_name}${user.given_name}`;
            const matchesText =
                fullName.includes(searchText) ||
                user.email.toLowerCase().includes(search);

            if (!matchesText) return false;
        }

        // ステータスフィルター
        if (filters.status.length > 0 && !filters.status.includes(user.status)) {
            return false;
        }

        // 部署フィルター
        if (filters.departments.length > 0) {
            const userDepts = Object.keys(user.departments);
            const hasMatchingDept = filters.departments.some(dept =>
                userDepts.includes(dept)
            );
            if (!hasMatchingDept) return false;
        }

        // 権限フィルター
        if (filters.role.length > 0 && !filters.role.includes(user.role)) {
            return false;
        }

        return true;
    });

    // 2. ソート
    if (filters.sortBy && filters.sortOrder) {
        result = [...result].sort((a, b) => {
            const comparison = compareUsers(a, b, filters.sortBy!);
            return filters.sortOrder === "asc" ? comparison : -comparison;
        });
    }

    return result;
};

/**
 * ソート用の比較関数
 */
const compareUsers = (a: User, b: User, sortBy: string): number => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
        case "name":
            aValue = `${a.family_name}${a.given_name}`.toLowerCase();
            bValue = `${b.family_name}${b.given_name}`.toLowerCase();
            break;
        case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
        case "createdAt":
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
        default:
            return 0;
    }

    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
};