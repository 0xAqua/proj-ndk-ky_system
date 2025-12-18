// @/features/admin/logs/components/ItemsPerPageSelect.tsx
import {
    Box,
    HStack,
    Text,
    createListCollection,
    Select, // ドット記法のために一括インポート
    Portal,
} from '@chakra-ui/react';

type Props = {
    value: number;
    onChange: (value: number) => void;
};

const itemsPerPageCollection = createListCollection({
    items: [
        { value: '30', label: '30' },
        { value: '50', label: '50' },
        { value: '100', label: '100' },
    ],
});

export const ItemsPerPageSelect = ({ value, onChange }: Props) => {
    return (
        <HStack gap={2}>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">表示:</Text>
            <Box width="48px">
                <Select.Root
                    collection={itemsPerPageCollection}
                    size="xs"
                    value={[String(value)]}
                    onValueChange={(e) => onChange(Number(e.value[0]))}
                    positioning={{ sameWidth: true, gutter: 4 }}
                >
                    <Select.Trigger px={2}>
                        <Select.ValueText />
                    </Select.Trigger>

                    {/* Portal を使うことで、最前面に浮かせます */}
                    <Portal>
                        <Select.Positioner zIndex="popover">
                            <Select.Content>
                                {itemsPerPageCollection.items.map((item) => (
                                    <Select.Item
                                        key={item.value}
                                        item={item}
                                        justifyContent="center"
                                    >
                                        {item.label}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Portal>
                </Select.Root>
            </Box>
        </HStack>
    );
};