import React, { useState, useEffect } from "react";
import { Box, Flex, Input, Stack, Text, Separator } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { PiListNumbers, PiSparkle, PiInfo, PiFiles, PiShieldCheck } from "react-icons/pi";
import type { PromptConfig } from "@/lib/service/tenantConfig";
import {AIOutputSettingsSkeleton} from "@/features/admin/settings/components/AIOutputSettingsSkeleton.tsx";

const MAX_INCIDENT_COUNT = 5;
const MAX_COUNTERMEASURES = 5;

interface AIOutputSettingsProps {
    // PromptConfig または null を受け取れるように変更
    config: PromptConfig | null;
    onChange: (config: PromptConfig) => void;
    isLoading: boolean;
}

export const AIOutputSettings = ({ config, onChange, isLoading }: AIOutputSettingsProps) => {
    // useState の初期値で config?. を使って安全にアクセスする
    const [localValues, setLocalValues] = useState({
        total_incidents: String(config?.total_incidents ?? "3"),
        fact_incidents: String(config?.fact_incidents ?? "0"),
        countermeasures_per_case: String(config?.countermeasures_per_case ?? "3"),
    });

    // configがnullから値が入ったタイミングで同期
    useEffect(() => {
        if (config) {
            setLocalValues({
                total_incidents: String(config.total_incidents),
                fact_incidents: String(config.fact_incidents),
                countermeasures_per_case: String(config.countermeasures_per_case),
            });
        }
    }, [config]);

    // 入力中のハンドラー（バリデーションせず文字として受け入れる）
    const handleInputChange = (key: keyof typeof localValues, value: string) => {
        setLocalValues((prev) => ({ ...prev, [key]: value }));
    };

    // フォーカスが外れたとき、またはEnter時に数値を確定・補正する
    const handleConfirm = (key: keyof typeof localValues) => {
        // 1. まず「config」が null でないことを保証する（Type Guard）
        // これにより、これ以降の行では config が PromptConfig 型として確定します
        if (!config) return;

        let num = parseInt(localValues[key], 10);

        // 不正な入力値のデフォルト補正
        if (isNaN(num)) num = (key === "fact_incidents") ? 0 : 1;

        // 2. nextConfig に型を明示し、config をスプレッドする
        // 上の if 文により、config は null ではないことが確実なので安全です
        const nextConfig: PromptConfig = { ...config };

        if (key === "total_incidents") {
            if (num > MAX_INCIDENT_COUNT) num = MAX_INCIDENT_COUNT;
            if (num < 1) num = 1;
            nextConfig.total_incidents = num;

            // 依存関係：総件数を減らした時に引用件数が上回らないよう調整
            if (nextConfig.fact_incidents > num) {
                nextConfig.fact_incidents = num;
            }
        } else if (key === "fact_incidents") {
            // config.total_incidents へのアクセスが安全になります
            const limit = config.total_incidents;
            if (num > limit) num = limit;
            if (num < 0) num = 0;
            nextConfig.fact_incidents = num;
        } else if (key === "countermeasures_per_case") {
            if (num > MAX_COUNTERMEASURES) num = MAX_COUNTERMEASURES;
            if (num < 1) num = 1;
            nextConfig.countermeasures_per_case = num;
        }

        // 3. ここで onChange に渡す際、nextConfig は完全に PromptConfig 型を満たしています
        onChange(nextConfig);

        // ローカルStateへの反映
        setLocalValues({
            total_incidents: String(nextConfig.total_incidents),
            fact_incidents: String(nextConfig.fact_incidents),
            countermeasures_per_case: String(nextConfig.countermeasures_per_case),
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: keyof typeof localValues) => {
        if (e.key === "Enter") {
            handleConfirm(key);
            (e.target as HTMLInputElement).blur();
        }
    };

    if (isLoading || !config) {
        return <AIOutputSettingsSkeleton />;
    }

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
                                value={localValues.total_incidents}
                                onChange={(e) => handleInputChange("total_incidents", e.target.value)}
                                onBlur={() => handleConfirm("total_incidents")}
                                onKeyDown={(e) => handleKeyDown(e, "total_incidents")}
                                textAlign="right"
                                borderColor="gray.300"
                                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                            />
                        </Box>
                    </Flex>

                    <Flex mt={3} p={3} bg="orange.50" borderLeftColor="orange.400" gap={2} align="start">
                        <Box color="orange.500" mt={0.5}>
                            <PiInfo size={16} />
                        </Box>
                        <Text fontSize="xs" color="orange.700">
                            出力件数が多いと、生成時間が長くなる場合があります（最大: {MAX_INCIDENT_COUNT}件 / 推奨: 3件）
                        </Text>
                    </Flex>
                </Box>

                <Separator borderColor="gray.100" />

                {/* 2. 同様のインシデント数 */}
                <Box>
                    <Flex justify="space-between" align="center">
                        <Flex align="start" gap={3} flex={1}>
                            <Box color="teal.500" mt={1}>
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
                                value={localValues.fact_incidents}
                                onChange={(e) => handleInputChange("fact_incidents", e.target.value)}
                                onBlur={() => handleConfirm("fact_incidents")}
                                onKeyDown={(e) => handleKeyDown(e, "fact_incidents")}
                                textAlign="right"
                                borderColor="gray.300"
                                _focus={{ borderColor: "teal.500", boxShadow: "0 0 0 1px var(--chakra-colors-teal-500)" }}
                            />
                        </Box>
                    </Flex>
                </Box>

                <Separator borderColor="gray.100" />

                {/* 3. インシデントあたりの対応策数 */}
                <Box>
                    <Flex justify="space-between" align="center">
                        <Flex align="start" gap={3} flex={1}>
                            <Box color="green.500" mt={1}>
                                <PiShieldCheck size={20} />
                            </Box>
                            <Box flex={1}>
                                <Text fontWeight="semibold" color="gray.800">
                                    インシデントあたりの対応策数
                                </Text>
                                <Text fontSize="sm" color="gray.500" mt={1}>
                                    1つのインシデントに対して生成する対応策の件数
                                </Text>
                            </Box>
                        </Flex>
                        <Box w="100px" ml={4}>
                            <Input
                                type="number"
                                value={localValues.countermeasures_per_case}
                                onChange={(e) => handleInputChange("countermeasures_per_case", e.target.value)}
                                onBlur={() => handleConfirm("countermeasures_per_case")}
                                onKeyDown={(e) => handleKeyDown(e, "countermeasures_per_case")}
                                textAlign="right"
                                borderColor="gray.300"
                                _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px var(--chakra-colors-green-500)" }}
                            />
                        </Box>
                    </Flex>
                    <Flex mt={3} p={3} bg="orange.50" borderLeftColor="orange.400" gap={2} align="start">
                        <Box color="orange.500" mt={0.5}>
                            <PiInfo size={16} />
                        </Box>
                        <Text fontSize="xs" color="orange.700">
                            対応策が多いと、生成時間が長くなる場合があります（最大: {MAX_INCIDENT_COUNT}件 / 推奨: 3件）
                        </Text>
                    </Flex>
                </Box>

                <Separator borderColor="gray.100" />

                {/* 4. 推測されるインシデントを含めるスイッチ */}
                <Flex
                    justify="space-between"
                    align="center"
                    cursor="pointer"
                    onClick={() => onChange({ ...config, include_predicted_incidents: !config.include_predicted_incidents })}
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

                    <Box onClick={(e) => e.stopPropagation()}>
                        <Switch
                            colorPalette="blue"
                            checked={config.include_predicted_incidents}
                            onCheckedChange={(e) => onChange({ ...config, include_predicted_incidents: e.checked })}
                            size="lg"
                        />
                    </Box>
                </Flex>
            </Stack>
        </Box>
    );
};