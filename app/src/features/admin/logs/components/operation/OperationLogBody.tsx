import { Table, Badge, Text } from "@chakra-ui/react";
import { OperationLogSkeleton } from "./OperationLogSkeleton";
import type { OperationLog } from "@/lib/service/logsService";

type Props = {
    data: OperationLog[];
    loading: boolean;
    rowsPerPage: number;
};

// カテゴリラベル
const CATEGORY_LABELS: Record<string, string> = {
    USER: "ユーザー",
    VQ: "VQ実行",
    CONFIG: "設定",
    DATA: "データ",
};

// アクションラベル
const ACTION_LABELS: Record<string, string> = {
    CREATE: "作成",
    UPDATE: "更新",
    DELETE: "削除",
    VIEW: "閲覧",
    EXECUTE: "実行",
};

// カテゴリバッジカラー
const CATEGORY_COLORS: Record<string, string> = {
    USER: "purple",
    VQ: "blue",
    CONFIG: "orange",
    DATA: "teal",
};

// アクションバッジカラー
const ACTION_COLORS: Record<string, string> = {
    CREATE: "green",
    UPDATE: "blue",
    DELETE: "red",
    VIEW: "gray",
    EXECUTE: "cyan",
};

export const OperationLogBody = ({ data, loading, rowsPerPage }: Props) => {
    if (loading) return <OperationLogSkeleton rows={rowsPerPage} />;

    if (data.length === 0) {
        return (
            <Table.Row>
                <Table.Cell colSpan={6} textAlign="center" py={10} color="gray.500">
                    該当するログが見つかりませんでした
                </Table.Cell>
            </Table.Row>
        );
    }

    return (
        <>
            {data.map((log, index) => (
                <Table.Row
                    key={`${log.createdAt}-${index}`}
                    transition="background-color 0.1s"
                    _hover={{ bg: "blue.50/30" }}
                >
                    <Table.Cell fontSize="xs" color="gray.700" whiteSpace="nowrap">
                        {log.createdAt}
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.600" maxW="150px" truncate>
                        {log.email}
                    </Table.Cell>
                    <Table.Cell>
                        <Badge
                            colorPalette={CATEGORY_COLORS[log.category] || "gray"}
                            variant="subtle"
                        >
                            {CATEGORY_LABELS[log.category] || log.category}
                        </Badge>
                    </Table.Cell>
                    <Table.Cell>
                        <Badge
                            colorPalette={ACTION_COLORS[log.action] || "gray"}
                            variant="outline"
                            size="sm"
                        >
                            {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.700" maxW="250px">
                        <Text truncate title={log.message}>
                            {log.message}
                        </Text>
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.500" fontFamily="mono">
                        {log.ipAddress || "-"}
                    </Table.Cell>
                </Table.Row>
            ))}
        </>
    );
};