import { Table, Skeleton } from "@chakra-ui/react";

export const AccessLogSkeleton = ({ rows = 6 }: { rows?: number }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <Table.Row key={`skeleton-${i}`}>
                    <Table.Cell><Skeleton h="14px" w="120px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="160px" /></Table.Cell>
                    <Table.Cell><Skeleton h="20px" w="80px" borderRadius="full" /></Table.Cell>
                    <Table.Cell><Skeleton h="20px" w="50px" borderRadius="full" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="100px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="100px" /></Table.Cell>
                </Table.Row>
            ))}
        </>
    );
};