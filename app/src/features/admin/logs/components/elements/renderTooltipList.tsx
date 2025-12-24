import {Box, Text, VStack, HStack} from "@chakra-ui/react"; // List を追加

// Tooltip の中身をリスト化する関数
export const renderTooltipList = (items: string[]) => (
    <VStack align="start" gap={1} py={1}>
        {items.map((item, index) => (
            <HStack key={index} gap={2}>
                <Box w="4px" h="4px" borderRadius="full" bg="blue.400" />
                <Text fontSize="xs" whiteSpace="nowrap">{item}</Text>
            </HStack>
        ))}
    </VStack>
);