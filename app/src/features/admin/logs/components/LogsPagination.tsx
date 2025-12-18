import { Flex, Text, HStack, Button } from "@chakra-ui/react";
import { PiCaretLeft, PiCaretRight } from "react-icons/pi";

type Props = {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
};

export const LogsPagination = ({
                                   currentPage,
                                   itemsPerPage,
                                   totalItems,
                                   onPageChange,
                               }: Props) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // UserAdminTable と同じ計算ロジック
    const rangeStart = totalItems === 0 ? 0 : itemsPerPage * (currentPage - 1) + 1;
    const rangeEnd = Math.min(itemsPerPage * currentPage, totalItems);

    return (
        <Flex justify="space-between" align="center" w="full">
            {/* 左側：件数表示（UserAdminTable の文言・スタイルに準拠） */}
            <Text fontSize="xs" color="gray.500">
                全 {totalItems} 件中 {rangeStart} - {rangeEnd} 件を表示
            </Text>

            {/* 右側：ページ送り（アイテム数が1ページ分より多いときだけ表示） */}
            {totalItems > itemsPerPage && (
                <HStack gap={2}>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <PiCaretLeft /> 前へ
                    </Button>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        次へ <PiCaretRight />
                    </Button>
                </HStack>
            )}
        </Flex>
    );
};