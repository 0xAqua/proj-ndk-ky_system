import { Table, Skeleton } from "@chakra-ui/react";

export const OperationLogSkeleton = ({ rows = 6 }: { rows?: number }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <Table.Row key={`skeleton-${i}`}>
                    <Table.Cell><Skeleton h="14px" w="120px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="140px" /></Table.Cell>
                    <Table.Cell><Skeleton h="20px" w="80px" borderRadius="full" /></Table.Cell>
                    <Table.Cell><Skeleton h="20px" w="60px" borderRadius="full" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="200px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="100px" /></Table.Cell>
                </Table.Row>
            ))}
        </>
    );
};