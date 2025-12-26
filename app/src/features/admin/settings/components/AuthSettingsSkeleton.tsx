import { Box, Flex, Stack, Separator, Skeleton } from "@chakra-ui/react";

export const AuthSettingsSkeleton = () => {
    return (
        <Box>
            <Stack gap={8}>
                {/* 1. メール認証 (OTP) 部分 */}
                <Flex justify="space-between" align="center" p={2} mx={-2}>
                    <Flex align="start" gap={3} flex={1}>
                        {/* アイコン部分 */}
                        <Skeleton width="20px" height="20px" borderRadius="md" mt={1} />

                        <Box flex={1}>
                            {/* タイトル */}
                            <Skeleton height="20px" width="240px" mb={2} />
                            {/* 説明文 (幅を%指定にしてレスポンシブ対応) */}
                            <Skeleton height="14px" width="80%" />
                            {/* 警告文が表示される可能性があるための余白的プレースホルダー（任意） */}
                            {/* <Skeleton height="12px" width="60%" mt={2} opacity={0.5} /> */}
                        </Box>
                    </Flex>

                    {/* Switch部分: 丸みを帯びた形状で表現 */}
                    <Box ml={4}>
                        <Skeleton width="44px" height="24px" borderRadius="full" />
                    </Box>
                </Flex>

                <Separator borderColor="gray.100" />

                {/* 2. Passkey設定 部分 */}
                <Box>
                    <Flex justify="space-between" align="center" p={2} mx={-2}>
                        <Flex align="start" gap={3} flex={1}>
                            {/* アイコン */}
                            <Skeleton width="20px" height="20px" borderRadius="md" mt={1} />

                            <Box flex={1}>
                                {/* タイトル */}
                                <Skeleton height="20px" width="200px" mb={2} />
                                {/* 説明文 */}
                                <Skeleton height="14px" width="70%" />
                            </Box>
                        </Flex>

                        {/* Switch部分 */}
                        <Box ml={4}>
                            <Skeleton width="44px" height="24px" borderRadius="full" />
                        </Box>
                    </Flex>

                    {/* 推奨メッセージ (緑のボックス) の再現 */}
                    <Skeleton mt={3} height="52px" borderRadius="md" width="100%" />
                </Box>
            </Stack>
        </Box>
    );
};