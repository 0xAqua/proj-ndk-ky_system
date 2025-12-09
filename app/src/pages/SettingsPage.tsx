import { useState } from "react";
import {
    Box,
    Button,
    Heading,
    Text,
    VStack,
    Flex,
    Input,
    Separator,
    Stack
} from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { PiFloppyDisk, PiGear } from "react-icons/pi";
import {AdminLayout} from "@/components/layout/AdminLayout.tsx";

export const SettingsPage = () => {
    // スイッチの動きを確認するためのState
    const [includePrediction, setIncludePrediction] = useState(true);

    return (
        <AdminLayout>
        <Box maxW="3xl" mx="auto">

            {/* 1. ヘッダーエリア */}
            <Box mb={8}>
                <Flex align="center" color="black" mb={0}>
                    {/* アイコン: sizeを36に、mrを3に調整 */}
                    <Box p={2} borderRadius="l2" bg="gray.100" mr={3} boxShadow="md">
                        <PiGear size={36}/> {/* アイコンサイズを調整 */}
                    </Box>

                    {/* テキストブロック */}
                    <Box>
                        {/* メインの見出し: lineHeightを削除し、デフォルトに任せるか1.2などに設定 */}
                        <Text
                            fontSize="22"
                            fontWeight="bold"
                            lineHeight="2" // 行間を自然に詰める
                            p={0}
                            m={0}
                        >
                            設定
                        </Text>

                        {/* 説明文 (サブテキスト) */}
                        <Text
                            color="gray.500"
                            fontSize="sm"
                            lineHeight="1"
                            mt="2px"
                            p={0}
                            m={0}
                        >
                            システム全体の動作設定を管理します。
                        </Text>
                    </Box>
                </Flex>

                {/* 補足説明文 */}
                <Text fontSize="sm" color="gray.500" mt={4}>
                    設定を変更すると、画面の読み込み速度や操作の応答時間に影響が出ることがありますので、ご注意ください。
                </Text>
            </Box>

            <VStack gap={6} align="stretch">

                {/* 2. カードエリア: AI出力設定 */}
                <Box
                    bg="white"
                    p={8}
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="gray.200"
                    shadow="sm"
                >
                    <Flex align="center" gap={3} mb={6}>
                        <Heading size="md" color="black">AI出力設定</Heading>
                    </Flex>

                    <Stack gap={8}> {/* 間隔を少し広げてスッキリさせる */}

                        {/* 項目1: 出力件数 */}
                        <Flex justify="space-between" align="center">
                            <Box>
                                <Text fontWeight="bold" color="black">インシデント出力件数</Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    1回の生成でAIが提案するリスク事例の数（推奨: 3〜5件）
                                </Text>
                            </Box>
                            <Box w="100px">
                                <Input
                                    type="number"
                                    defaultValue={3}
                                    min={1}
                                    max={10}
                                    textAlign="right"
                                    borderColor="gray.300"
                                    _focus={{ borderColor: "black", outlineColor: "black" }}
                                />
                            </Box>
                        </Flex>

                        <Separator borderColor="gray.100" />

                        {/* 項目2: 推測結果の表示 (Switch) */}
                        <Flex
                            justify="space-between"
                            align="center"
                            cursor="pointer"
                            // ここでステートを反転させる（ここだけ残す）
                            onClick={() => setIncludePrediction(!includePrediction)}
                            _hover={{ opacity: 0.8 }} // クリックできる感触を出すため推奨
                        >
                            <Box>
                                <Text fontWeight="bold" color="black">推測されるインシデントを含める</Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    ONにすると、過去事例だけでなくAI予測も表示します
                                </Text>
                            </Box>

                            {/* Switchコンポーネント */}
                            <Switch
                                colorPalette="blue"
                                checked={includePrediction}
                                pointerEvents="none"
                                size="lg"
                            />
                        </Flex>

                    </Stack>
                </Box>

                {/* 3. 保存ボタンエリア */}
                <Flex justify="flex-end">
                    <Button
                        bg="green.500"
                        color="white"
                        size="lg"
                        px={8}
                        borderRadius="md"
                        _hover={{ bg: "gray.800" }}
                    >
                        <PiFloppyDisk style={{ marginRight: "8px" }} />
                        変更を保存
                    </Button>
                </Flex>

            </VStack>
        </Box>
        </AdminLayout>
    );
};