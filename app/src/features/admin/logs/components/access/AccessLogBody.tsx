import { Table, Badge, Text } from "@chakra-ui/react";
import { AccessLogSkeleton } from "./AccessLogSkeleton";
import type { AccessLog } from "@/lib/service/logs";

type Props = {
    data: AccessLog[];
    loading: boolean;
    rowsPerPage: number;
};

export const AccessLogBody = ({ data, loading, rowsPerPage }: Props) => {
    if (loading) return <AccessLogSkeleton rows={rowsPerPage} />;

    if (data.length === 0) {
        return (
            <Table.Row>
                <Table.Cell colSpan={6} textAlign="center" py={10} color="gray.500">
                    該当するログが見つかりませんでした
                </Table.Cell>
            </Table.Row>
        );
    }

    const getResultBadge = (result: string) => {
        if (result === "Pass") {
            return <Badge colorPalette="green" variant="subtle">成功</Badge>;
        }
        return <Badge colorPalette="red" variant="subtle">失敗</Badge>;
    };

    const getEventTypeBadge = (eventType: string) => {
        switch (eventType) {
            case "SignIn":
                return <Badge colorPalette="blue" variant="subtle">ログイン</Badge>;
            case "SignIn_Failure":
                return <Badge colorPalette="red" variant="subtle">ログイン失敗</Badge>;
            case "TokenRefresh":
                return <Badge colorPalette="gray" variant="subtle">トークン更新</Badge>;
            default:
                return <Badge variant="subtle">{eventType}</Badge>;
        }
    };

    const getRiskBadge = (riskLevel: string) => {
        switch (riskLevel) {
            case "LOW":
                return <Badge colorPalette="green" variant="outline" size="sm">低</Badge>;
            case "MEDIUM":
                return <Badge colorPalette="orange" variant="outline" size="sm">中</Badge>;
            case "HIGH":
                return <Badge colorPalette="red" variant="outline" size="sm">高</Badge>;
            default:
                return null;
        }
    };

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
                    <Table.Cell fontSize="sm" color="gray.600" maxW="180px" truncate>
                        {log.email}
                    </Table.Cell>
                    <Table.Cell>
                        {getEventTypeBadge(log.eventType)}
                    </Table.Cell>
                    <Table.Cell>
                        {getResultBadge(log.result)}
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.500" fontFamily="mono">
                        {log.ipAddress}
                    </Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.600">
                        <Text>
                            {log.city && log.country ? `${log.city}, ${log.country}` : log.country || "-"}
                        </Text>
                        {log.riskLevel && getRiskBadge(log.riskLevel)}
                    </Table.Cell>
                </Table.Row>
            ))}
        </>
    );
};