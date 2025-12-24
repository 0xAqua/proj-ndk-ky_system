import { Table, Skeleton } from "@chakra-ui/react";

export const ExecutionLogSkeleton = ({ rows = 6 }: { rows?: number }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <Table.Row key={`skeleton-${i}`}>
                    <Table.Cell><Skeleton h="14px" w="120px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="140px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="100px" /></Table.Cell>
                    <Table.Cell><Skeleton h="14px" w="180px" /></Table.Cell>
                    <Table.Cell><Skeleton h="20px" w="50px" borderRadius="full" /></Table.Cell>
                    <Table.Cell textAlign="right"><Skeleton h="14px" w="40px" ml="auto" /></Table.Cell>
                </Table.Row>
            ))}
        </>
    );
};