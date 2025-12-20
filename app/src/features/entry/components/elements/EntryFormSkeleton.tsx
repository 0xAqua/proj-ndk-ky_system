import { Box, VStack, Skeleton, SkeletonText, HStack } from "@chakra-ui/react";

export const EntryFormSkeleton = () => {
    // 共通のカードスタイル
    const cardStyle = {
        bg: "white",
        p: 6,
        borderRadius: "xl",
        borderWidth: "1px",
        borderColor: "gray.200",
        shadow: "sm",
    };

    return (
        <Box maxW="600px" mx="auto" pb={10} px={4}>
            <VStack gap={8} align="stretch">
                {/* 1. 日付セクション */}
                <Box {...cardStyle}>
                    <VStack align="flex-start" gap={3}>
                        <Skeleton h="20px" w="100px" /> {/* ラベル */}
                        <Skeleton h="45px" w="full" borderRadius="md" /> {/* 入力欄 */}
                    </VStack>
                </Box>

                {/* 2. 工事種別セクション */}
                <Box {...cardStyle}>
                    <VStack align="flex-start" gap={4}>
                        <Skeleton h="20px" w="120px" />
                        <HStack gap={2} wrap="wrap">
                            <Skeleton h="32px" w="80px" borderRadius="full" />
                            <Skeleton h="32px" w="100px" borderRadius="full" />
                            <Skeleton h="32px" w="90px" borderRadius="full" />
                        </HStack>
                    </VStack>
                </Box>

                {/* 3. 工程セクション */}
                <Box {...cardStyle}>
                    <VStack align="flex-start" gap={4}>
                        <Skeleton h="20px" w="80px" />
                        <SkeletonText noOfLines={3} gap="4" />
                    </VStack>
                </Box>

                {/* 4. 現場状況セクション */}
                <Box {...cardStyle}>
                    <VStack align="flex-start" gap={4}>
                        <Skeleton h="20px" w="150px" />
                        <VStack align="stretch" w="full" gap={3}>
                            <Skeleton h="40px" w="full" borderRadius="md" />
                            <Skeleton h="40px" w="full" borderRadius="md" />
                            <Skeleton h="40px" w="full" borderRadius="md" />
                        </VStack>
                    </VStack>
                </Box>

                {/* 5. 送信ボタン */}
                <Box pt={4}>
                    <Skeleton h="56px" w="full" borderRadius="full" />
                </Box>
            </VStack>
        </Box>
    );
};