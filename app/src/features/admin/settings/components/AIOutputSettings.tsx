// components/settings/AIOutputSettings.tsx
import { Box, Flex, Input, Stack, Text, Separator } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
// PiFiles を追加
import { PiListNumbers, PiSparkle, PiInfo, PiFiles } from "react-icons/pi";

// 定数の定義
const MAX_INCIDENT_COUNT = 10;
const DEFAULT_INCIDENT_COUNT = 3;
const DEFAULT_FACT_COUNT = 1;

export const AIOutputSettings = () => {
    const [incidentCount, setIncidentCount] = useState<number | "">(DEFAULT_INCIDENT_COUNT);
    const [factIncidents, setFactIncidents] = useState<number | "">(DEFAULT_FACT_COUNT);
    const [includePrediction, setIncludePrediction] = useState(true);

    const incidentCountNum = typeof incidentCount === "number" ? incidentCount : 0;

    const handleIncidentCountChange = (value: string) => {
        if (value === "") {
            setIncidentCount("");
            return;
        }
        let num = Number(value);
        if (isNaN(num)) return;
        if (num > MAX_INCIDENT_COUNT) num = MAX_INCIDENT_COUNT;
        setIncidentCount(num);
        if (typeof factIncidents === "number" && factIncidents > num) {
            setFactIncidents(num);
        }
    };

    const handleFactCountChange = (value: string) => {
        if (value === "") {
            setFactIncidents("");
            return;
        }
        let num = Number(value);
        if (isNaN(num)) return;
        const limit = incidentCountNum > 0 ? incidentCountNum : MAX_INCIDENT_COUNT;
        if (num > limit) num = limit;
        setFactIncidents(num);
    };

    return (
        <Box>
            <Stack gap={8}>
                {/* 1. インシデント出力件数 */}
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
                                    1回の生成でAIが提案するリスク事例の総数
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

                {/* 2. 同様のインシデント数 */}
                <Box>
                    <Flex justify="space-between" align="center">
                        <Flex align="start" gap={3} flex={1}>
                            <Box color="teal.500" mt={1}>
                                {/* ここを PiFiles に変更しました */}
                                <PiFiles size={20} />
                            </Box>
                            <Box flex={1}>
                                <Text fontWeight="semibold" color="gray.800">
                                    同様のインシデント数
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    過去の事例から引用する件数（出力件数以下）
                                </Text>
                            </Box>
                        </Flex>
                        <Box w="100px" ml={4}>
                            <Input
                                type="number"
                                value={factIncidents}
                                onChange={(e) => handleFactCountChange(e.target.value)}
                                min={0}
                                max={incidentCountNum || MAX_INCIDENT_COUNT}
                                textAlign="right"
                                borderColor="gray.300"
                                _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px var(--chakra-colors-teal-500)" }}
                            />
                        </Box>
                    </Flex>
                </Box>

                <Separator borderColor="gray.100" />

                {/* 3. 推測されるインシデントを含めるスイッチ */}
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
                                過去事例に加えて、AIによる予測インシデントも生成に含めます
                            </Text>
                        </Box>
                    </Flex>

                    {/* 【修正箇所】
                       Switch自体にonClickをつけるのではなく、
                       Boxで囲ってそこで stopPropagation します。
                       これで確実にイベントのバブリング（親への伝播）を阻止できます。
                    */}
                    <Box onClick={(e) => e.stopPropagation()}>
                        <Switch
                            colorPalette="blue"
                            checked={includePrediction}
                            onCheckedChange={(e) => setIncludePrediction(!!e.checked)}
                            size="lg"
                        />
                    </Box>
                </Flex>
            </Stack>
        </Box>
    );
};