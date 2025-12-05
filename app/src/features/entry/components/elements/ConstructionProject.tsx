import { VStack, Text, Flex, Box } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox"; // パスは環境に合わせてください
import { MdConstruction } from "react-icons/md";
import { MultiSelect } from "@/features/entry/components/elements/MultiSelect";
import type {ProcessCategory} from "@/features/entry/hooks/useConstructionMaster"; // 型定義をインポート

interface Props {
    // マスタデータを受け取る
    masterCategories: ProcessCategory[];
    // 選択された「種別ID」の配列 (例: ["DEPT#1#TYPE#1"])
    selectedTypeIds: string[];
    // 変更通知
    onChange: (typeIds: string[]) => void;
}

export const ConstructionProject = ({ masterCategories, selectedTypeIds, onChange }: Props) => {

    // 1. マスタデータを MultiSelect 用の形式 (value: index) に変換
    const options = masterCategories.map((cat, index) => ({
        value: index, // インデックスを値として使う
        label: cat.name
    }));

    // 2. IDの配列を、インデックスの配列に変換 (UI表示用)
    const selectedIndices = selectedTypeIds
        .map(id => masterCategories.findIndex(cat => cat.id === id))
        .filter(index => index !== -1);

    // 3. 変更イベント: インデックスから本来のIDに戻して親に通知
    const handleChange = (indices: number[]) => {
        const nextIds = indices.map(index => masterCategories[index].id);
        onChange(nextIds);
    };

    return (
        <Box bg="white" w="full" p={2} borderRadius="2xl" boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)" >
            <ContentBox>
                <VStack align="start" gap={3} w="full">
                    <Flex align="center" gap={2}>
                        <MdConstruction size={16} color="#8E8E93" />
                        <Text fontWeight="bold" fontSize="sm">工事種別</Text>
                        <Text color="red.500" fontSize="sm">*</Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.500">
                        該当する工事の種別をすべて選択してください。（複数選択可）
                    </Text>
                    <Box w="full">
                        <MultiSelect
                            options={options}
                            selected={selectedIndices}
                            onChange={handleChange}
                            placeholder="工事種別を選択してください"
                        />
                    </Box>
                </VStack>
            </ContentBox>
        </Box>
    );
};