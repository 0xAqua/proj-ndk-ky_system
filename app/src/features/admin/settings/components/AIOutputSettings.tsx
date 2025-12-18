// components/settings/AIOutputSettings.tsx
import { Box, Flex, Input, Stack, Text, Separator } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { PiListNumbers, PiSparkle, PiInfo } from "react-icons/pi";

// 定数の定義
const MAX_INCIDENT_COUNT = 10;
const DEFAULT_INCIDENT_COUNT = 3;
const DEFAULT_PREDICTION_COUNT = 2;

export const AIOutputSettings = () => {
    const [includePrediction, setIncludePrediction] = useState(true);
    const [predictionCount, setPredictionCount] = useState<number | "">(DEFAULT_PREDICTION_COUNT);
    const [incidentCount, setIncidentCount] = useState<number | "">(DEFAULT_INCIDENT_COUNT);

    // 数値として扱うためのヘルパー
    const incidentCountNum = typeof incidentCount === "number" ? incidentCount : 0;
    const handleIncidentCountChange = (value: string) => {
        if (value === "") {
            setIncidentCount("");
            return;
        }

        let num = Number(value);
        if (isNaN(num)) return;

        // 最大値の制限（定数を使用）
        if (num > MAX_INCIDENT_COUNT) num = MAX_INCIDENT_COUNT;

        setIncidentCount(num);

        // インシデント件数を減らしたとき、予測件数がそれを超えないように調整
        if (typeof predictionCount === "number" && predictionCount > num) {
            setPredictionCount(num);
        }
    };

    const handlePredictionCountChange = (value: string) => {
        if (value === "") {
            setPredictionCount("");
            return;
        }

        let num = Number(value);
        if (isNaN(num)) return;

        // インシデント出力件数を超えないように制限
        const limit = incidentCountNum > 0 ? incidentCountNum : MAX_INCIDENT_COUNT;
        if (num > limit) num = limit;

        setPredictionCount(num);
    };

    return (
        <Box>
            <Stack gap={8}>
                {/* インシデント出力件数 */}
                <Box>
                    <Flex justify="space-between" align="center">
                        <Flex align="start" gap={3} flex={1}>
                            <Box color="blue.500" mt={1}>
                                <PiListNumbers size={20} />
                            </Box>
                            <Box flex={1}>
                                <Text fontWeight="semibold" color="gray.800">
                                    インシデント出力件数
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    1回の生成でAIが提案するリスク事例の数
                                </Text>
                            </Box>
                        </Flex>
                        <Box w="100px" ml={4}>
                            <Input
                                type="number"
                                value={incidentCount}
                                onChange={(e) => handleIncidentCountChange(e.target.value)}
                                min={1}
                                max={MAX_INCIDENT_COUNT}
                                textAlign="right"
                                borderColor="gray.300"
                                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                            />
                        </Box>
                    </Flex>

                    {/* 注意メッセージ */}
                    <Flex
                        mt={3}
                        p={3}
                        bg="orange.50"
                        borderRadius="md"
                        borderLeftColor="orange.400"
                        gap={2}
                        align="start"
                    >
                        <Box color="orange.500" mt={0.5}>
                            <PiInfo size={16} />
                        </Box>
                        <Text fontSize="xs" color="orange.700">
                            出力件数が多いと、生成時間が長くなる場合があります（最大: {MAX_INCIDENT_COUNT}件 / 推奨: 3〜5件）
                        </Text>
                    </Flex>
                </Box>

                <Separator borderColor="gray.100" />

                {/* 推測されるインシデントを含める */}
                <Flex
                    justify="space-between"
                    align="center"
                    cursor="pointer"
                    onClick={() => setIncludePrediction(!includePrediction)}
                    _hover={{ bg: "gray.50" }}
                    p={2}
                    mx={-2}
                    borderRadius="md"
                    transition="background 0.2s"
                >
                    <Flex align="start" gap={3} flex={1}>
                        <Box color="purple.500" mt={1}>
                            <PiSparkle size={20} />
                        </Box>
                        <Box flex={1}>
                            <Text fontWeight="semibold" color="gray.800">
                                推測されるインシデントを含める
                            </Text>
                            <Text fontSize="sm" color="gray.500" mt={1}>
                                過去事例に加えて、AIによる予測インシデントも表示します
                            </Text>
                        </Box>
                    </Flex>

                    <Switch
                        colorPalette="blue"
                        checked={includePrediction}
                        onCheckedChange={(e) => setIncludePrediction(!!e.checked)}
                        size="lg"
                    />
                </Flex>

                {/* AI予測件数（includePredictionがtrueの時のみ表示） */}
                {includePrediction && (
                    <>
                        <Separator borderColor="gray.100" />

                        <Box>
                            <Flex justify="space-between" align="center">
                                <Flex align="start" gap={3} flex={1}>
                                    <Box color="purple.500" mt={1}>
                                        <PiSparkle size={20} />
                                    </Box>
                                    <Box flex={1}>
                                        <Text fontWeight="semibold" color="gray.800">
                                            AI予測インシデント件数
                                        </Text>
                                        <Text fontSize="sm" color="gray.500" mt={1}>
                                            予測されるインシデントの最大表示件数（出力件数以下）
                                        </Text>
                                    </Box>
                                </Flex>
                                <Box w="100px" ml={4}>
                                    <Input
                                        type="number"
                                        value={predictionCount}
                                        onChange={(e) => handlePredictionCountChange(e.target.value)}
                                        min={1}
                                        max={incidentCountNum || MAX_INCIDENT_COUNT}
                                        textAlign="right"
                                        borderColor="gray.300"
                                        _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                                    />
                                </Box>
                            </Flex>

                            {/* 注意メッセージ */}
                            <Flex
                                mt={3}
                                p={3}
                                bg="purple.50"
                                borderRadius="md"
                                borderLeftColor="purple.400"
                                gap={2}
                                align="start"
                            >
                                <Box color="purple.500" mt={0.5}>
                                    <PiInfo size={16} />
                                </Box>
                                <Text fontSize="xs" color="purple.700">
                                    予測精度を保つため、{Math.max(1, incidentCountNum - 1)}件以下を推奨します
                                </Text>
                            </Flex>
                        </Box>
                    </>
                )}
            </Stack>
        </Box>
    );
};