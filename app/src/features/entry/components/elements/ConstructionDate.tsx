import { Input, Flex, Text, VStack, Box } from "@chakra-ui/react";
import { ContentBox } from "@/features/entry/components/layout/ContentBox";
import { MdCalendarToday } from "react-icons/md";

type DateProps = {
    value?: string;
    onChange?: (value: string) => void;
};

export default function ConstructionDate ({ value, onChange }: DateProps) {
    // 今日の日付を "YYYY-MM-DD" 形式に整形
    const today = new Date().toISOString().split("T")[0];

    return (
        <Box bg="white" w="full" py={2} borderRadius="2xl" boxShadow="0 4px 16px rgba(0, 0, 0, 0.08)" >
            <ContentBox>
                <VStack align="start" gap={2} w="full">
                    <Flex align="center" gap={2}>
                        <MdCalendarToday size={16} color="#007AFF" />
                        <Text fontWeight="bold" fontSize="sm">
                            工事日付
                        </Text>
                        <Text color="red.500" fontSize="sm">
                            *
                        </Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.500">
                        工事の実施日を選択してください。
                    </Text>
                    <Input
                        type="date"
                        name="date"
                        value={value ?? today}
                        onChange={(e) => onChange?.(e.target.value)}
                        w="full"
                    />
                </VStack>
            </ContentBox>
        </Box>
    );
}