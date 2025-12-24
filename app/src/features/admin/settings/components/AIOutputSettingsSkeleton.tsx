import { Box, Flex, Stack, Separator, Skeleton } from "@chakra-ui/react";

export const AIOutputSettingsSkeleton = () => {
    return (
        <Box>
            <Stack gap={8}>
                {[1, 2, 3].map((i) => (
                    <Box key={i}>
                        <Flex justify="space-between" align="center">
                            <Flex align="start" gap={3} flex={1}>
                                <Skeleton width="20px" height="20px" borderRadius="md" mt={1} />
                                <Box flex={1}>
                                    <Skeleton height="20px" width="150px" mb={2} />
                                    <Skeleton height="14px" width="280px" />
                                </Box>
                            </Flex>
                            <Box w="100px" ml={4}>
                                <Skeleton height="40px" borderRadius="md" />
                            </Box>
                        </Flex>

                        {/* 1番目と3番目の案内ボックスを再現 */}
                        {(i === 1 || i === 3) && (
                            <Skeleton mt={3} height="48px" borderRadius="md" width="100%" />
                        )}

                        <Separator borderColor="gray.100" mt={8} />
                    </Box>
                ))}

                <Flex justify="space-between" align="center" p={2} mx={-2}>
                    <Flex align="start" gap={3} flex={1}>
                        <Skeleton width="20px" height="20px" borderRadius="md" mt={1} />
                        <Box flex={1}>
                            <Skeleton height="20px" width="200px" mb={2} />
                            <Skeleton height="14px" width="320px" />
                        </Box>
                    </Flex>
                    <Box>
                        <Skeleton width="44px" height="24px" borderRadius="full" />
                    </Box>
                </Flex>
            </Stack>
        </Box>
    );
};