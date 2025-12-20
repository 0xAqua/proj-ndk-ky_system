import { Box, VStack, Skeleton, Stack, StackSeparator } from "@chakra-ui/react";

export const ResultFormSkeleton = () => (
    <VStack gap={6} align="stretch">
        {/* 結果カードのプレースホルダー */}
        <Stack gap={0} separator={<StackSeparator borderColor="gray.100" />}>
            {[1, 2, 3].map((i) => (
                <Box key={i} p={6}>
                    <VStack align="start" gap={4}>
                        <Skeleton h="24px" w="70%" />
                        <Skeleton h="16px" w="90%" />
                        <Skeleton h="16px" w="40%" />
                    </VStack>
                </Box>
            ))}
        </Stack>
    </VStack>
);