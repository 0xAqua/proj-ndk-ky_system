import { Box, Flex, Stack, Text, Separator, Button, HStack } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import { PiListNumbers, PiSparkle, PiWarning, PiFiles, PiShieldCheck } from "react-icons/pi";
import type { PromptConfig } from "@/lib/service/tenantConfig";
import { AIOutputSettingsSkeleton } from "@/features/admin/settings/components/AIOutputSettingsSkeleton.tsx";

const MAX_INCIDENT_COUNT = 5;
const MAX_COUNTERMEASURES = 5;

interface AIOutputSettingsProps {
    config: PromptConfig | null;
    onChange: (config: PromptConfig) => void;
    isLoading: boolean;
}

export const AIOutputSettings = ({ config, onChange, isLoading }: AIOutputSettingsProps) => {

    // 数値確定用のロジック
    const handleValueSelect = (key: keyof PromptConfig, value: number) => {
        if (!config) return;

        const nextConfig = { ...config, [key]: value };

        // 依存関係：出力総数を減らした時に、引用数がそれを上回らないよう自動調整
        if (key === "total_incidents") {
            if (nextConfig.fact_incidents > value) {
                nextConfig.fact_incidents = value;
            }
        }

        onChange(nextConfig);
    };

    if (isLoading || !config) {
        return <AIOutputSettingsSkeleton />;
    }

    // 選択ボタンのグループコンポーネント
    const NumberSelector = ({
                                currentValue,
                                min = 1,
                                max = 5,
                                onSelect
                            }: { currentValue: number, min?: number, max?: number, onSelect: (v: number) => void }) => (
        <HStack gap={1}>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
                <Button
                    key={num}
                    size="sm"
                    variant={currentValue === num ? "solid" : "outline"}
                    colorPalette={currentValue === num ? "blue" : "gray"}
                    onClick={() => onSelect(num)}
                    minW="42px"
                    fontWeight={currentValue === num ? "bold" : "normal"}
                    _hover={{ transform: "translateY(-1px)", shadow: "sm" }}
                    transition="all 0.2s"
                >
                    {num}
                </Button>
            ))}
        </HStack>
    );

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
                        <Box ml={4}>
                            <NumberSelector
                                currentValue={config.total_incidents}
                                max={MAX_INCIDENT_COUNT}
                                onSelect={(v) => handleValueSelect("total_incidents", v)}
                            />
                        </Box>
                    </Flex>

                    <Flex mt={4} p={3} bg="orange.50" gap={2} align="start" borderRadius="sm">
                        <Box color="orange.500" mt={0.5}>
                            <PiWarning size={16} />
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
                                    過去の事例から引用する件数
                                </Text>
                            </Box>
                        </Flex>
                        <Box ml={4}>
                            <NumberSelector
                                currentValue={config.fact_incidents}
                                min={0}
                                max={config.total_incidents} // 出力件数を超えないように動的に制限
                                onSelect={(v) => handleValueSelect("fact_incidents", v)}
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
                        <Box ml={4}>
                            <NumberSelector
                                currentValue={config.countermeasures_per_case}
                                max={MAX_COUNTERMEASURES}
                                onSelect={(v) => handleValueSelect("countermeasures_per_case", v)}
                            />
                        </Box>
                    </Flex>
                    <Flex mt={4} p={3} bg="orange.50" borderLeftColor="orange.400" gap={2} align="start" borderRadius="sm">
                        <Box color="orange.500" mt={0.5}>
                            <PiWarning size={16} />
                        </Box>
                        <Text fontSize="xs" color="orange.700">
                            対応策が多いと、生成時間が長くなる場合があります（最大: {MAX_COUNTERMEASURES}件 / 推奨: 3件）
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