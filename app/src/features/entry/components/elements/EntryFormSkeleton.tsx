import { Box, VStack, Skeleton } from "@chakra-ui/react";

export const EntryFormSkeleton = () => {
    return (
        <Box maxW="600px" mx="auto" pb={10} px={4}>
            <VStack gap={8} align="stretch">
                {/* 日付セクションのスケルトン */}
                <Skeleton h="60px" borderRadius="md" />

                {/* 工事種別セクションのスケルトン */}
                <Skeleton h="120px" borderRadius="md" />

                {/* 工程セクションのスケルトン */}
                <Skeleton h="150px" borderRadius="md" />

                {/* 重要機材セクションのスケルトン */}
                <Skeleton h="100px" borderRadius="md" />

                {/* 現場状況セクションのスケルトン */}
                <Skeleton h="120px" borderRadius="md" />

                {/* 送信ボタンのスケルトン */}
                <Skeleton h="50px" borderRadius="full" />
            </VStack>
        </Box>
    );
};