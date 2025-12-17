import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, UsersResponse, CreateUserInput, UpdateUserInput } from "@/features/admin/users/types/types";

// ユーザー一覧取得
export const useUsers = () => {
    return useQuery({
        queryKey: ["admin", "users"],
        queryFn: async () => {
            const res = await api.get<UsersResponse>("/admin/users");
            return res.data;
        },
    });
};

// ユーザー詳細取得
export const useUser = (userId: string) => {
    return useQuery({
        queryKey: ["admin", "users", userId],
        queryFn: async () => {
            const res = await api.get<{ user: User }>(`/admin/users/${userId}`);
            return res.data.user;
        },
        enabled: !!userId,
    });
};

// ユーザー作成
export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateUserInput) => {
            const res = await api.post("/admin/users", input);
            return res.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

// ユーザー更新
export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserInput }) => {
            const res = await api.patch(`/admin/users/${userId}`, data);
            return res.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

// ユーザー削除
export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const res = await api.delete(`/admin/users/${userId}`);
            return res.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};