import { useState, useRef, useEffect } from "react";
import { Box, Flex, Text, Tag} from "@chakra-ui/react";
import { Checkbox } from "@chakra-ui/react";

interface Option {
    value: number;
    label: string;
}

interface MultiSelectUiProps {
    options: Option[];
    selected: number[];
    onChange: (selected: number[]) => void;
    placeholder?: string;
}

export const MultiSelect = ({
                                  options,
                                  selected,
                                  onChange,
                                  placeholder = "選択してください"
                              }: MultiSelectUiProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 外側クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (value: number) => {
        const newSelected = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const removeOption = (value: number) => {
        onChange(selected.filter(v => v !== value));
    };

    const selectedOptions = options.filter(opt => selected.includes(opt.value));

    return (
        <Box position="relative" ref={containerRef}>
            {/* 選択ボックス */}
            <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                p={2}
                minH="40px"
                cursor="pointer"
                onClick={() => setIsOpen(!isOpen)}
                bg="white"
            >
                {selectedOptions.length > 0 ? (
                    <Flex gap={1} wrap="wrap">
                        {selectedOptions.map(option => (
                            <Tag.Root
                                key={option.value}
                                size="sm"
                                colorPalette="blue"
                            >
                                <Tag.Label>{option.label}</Tag.Label>
                                <Tag.CloseTrigger
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeOption(option.value);
                                    }}
                                />
                            </Tag.Root>
                        ))}
                    </Flex>
                ) : (
                    <Text color="gray.400">{placeholder}</Text>
                )}
            </Box>

            {/* ドロップダウンリスト */}
            {isOpen && (
                <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    mt={1}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    maxH="200px"
                    overflowY="auto"
                    zIndex={10}
                    boxShadow="lg"
                    p={2}
                >
                    {options.map(option => (
                        <Flex
                            key={option.value}
                            p={2}
                            _hover={{ bg: "gray.50" }}
                            cursor="pointer"
                            onClick={() => toggleOption(option.value)}
                            align="center"
                            gap={2}
                        >
                            <Checkbox.Root
                                checked={selected.includes(option.value)}
                                pointerEvents="none"
                                colorPalette={"green"}
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                            </Checkbox.Root>
                            <Text>{option.label}</Text>
                        </Flex>
                    ))}
                </Box>
            )}
        </Box>
    );
};