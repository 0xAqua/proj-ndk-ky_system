import React, { useState } from "react";
import { Flex, Box, Input, Button, HStack } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel, PiPlus, PiArrowCounterClockwise } from "react-icons/pi";
import { type FilterConditions, UserAdminFilterModal } from "./UserAdminFilterModal";
import { UserAdminAddModal } from "@/features/admin/users/components/UserAdminAddModal";
import { Tooltip } from "@/components/ui/tooltip";

type UserAdminFiltersProps = {
    onSearch: (text: string) => void;
    onFilterChange: (filters: FilterConditions) => void;
};

export const UserAdminTableHeader = ({ onSearch, onFilterChange }: UserAdminFiltersProps) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<FilterConditions>({
        status: [],
        departments: [],
        role: [],
        sortBy: undefined,
        sortOrder: undefined,
    });

    const handleFilterApply = (filters: FilterConditions) => {
        setCurrentFilters(filters);
        onFilterChange(filters);
    };

    const hasActiveFilters =
        currentFilters.status.length > 0 ||
        currentFilters.departments.length > 0 ||
        currentFilters.role.length > 0 ||
        currentFilters.sortBy !== undefined;

    const handleFilterReset = () => {
        const emptyFilters: FilterConditions = {
            status: [],
            departments: [],
            role: [],
            sortBy: undefined,
            sortOrder: undefined,
        };
        setCurrentFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    const [searchText, setSearchText] = useState("");

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
        onSearch(value);
    };

    return (
        <>
            <Flex
                mb={6}
                bg="white"
                p={4}
                borderRadius="xl"
                shadow="sm"
                align="center"
                justify="space-between"
                borderWidth="1px"
                borderColor="gray.100" // 境界線を追加
            >
                {/* 左側：検索 + フィルター */}
                <Flex align="center" gap={4}>
                    {/* 検索ボックス：AccessLogsTable と同じ質感 */}
                    <Box position="relative" w="300px">
                        <Box
                            position="absolute"
                            left={3}
                            top="50%"
                            transform="translateY(-50%)"
                            zIndex={1}
                            pointerEvents="none"
                        >
                            <PiMagnifyingGlass color="#A0AEC0" size={20} />
                        </Box>
                        <Input
                            placeholder="メールで検索..."
                            pl={10}
                            size="md"
                            variant="subtle"
                            bg="#f8f9fa"
                            borderRadius="lg"
                            value={searchText}
                            onChange={handleSearchChange}
                            _focus={{ bg: "white", borderColor: "blue.400", boxShadow: "sm" }}
                        />
                    </Box>

                    {/* フィルターボタン一式 */}
                    <HStack gap={2}>
                        <Tooltip content="条件で絞り込む" showArrow openDelay={0}>
                            <Button
                                variant="outline"
                                size="md"
                                onClick={() => setIsFilterModalOpen(true)}
                                borderRadius="lg"
                                bg="white"
                                _hover={{ bg: "gray.50" }}
                            >
                                <PiFunnel />
                            </Button>
                        </Tooltip>

                        {hasActiveFilters && (
                            <Tooltip content="フィルターをリセット" showArrow openDelay={0}>
                                <Button
                                    variant="outline"
                                    size="md"
                                    onClick={handleFilterReset}
                                    colorScheme="red"
                                    borderRadius="lg"
                                    bg="white"
                                    _hover={{ bg: "gray.50" }}
                                >
                                    <PiArrowCounterClockwise />
                                </Button>
                            </Tooltip>
                        )}
                    </HStack>
                </Flex>

                {/* ユーザー追加ボタン：伸縮アニメーション追加 */}
                <Tooltip content="新規ユーザーを追加" positioning={{ placement: "bottom" }} showArrow openDelay={0}>
                    <Button
                        aria-label="ユーザーを追加"
                        variant="solid"
                        bg="orange.500"
                        color="white"
                        borderRadius="full"
                        shadow="md"
                        boxShadow="md" // 少しだけ影をつけると浮き上がって見えます
                        minW="42px" h="42px"
                        p={0}
                        _hover={{ bg: "orange.600", }}
                        _active={{ transform: "scale(0.92)" }}
                        transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <PiPlus size={22} />
                    </Button>
                </Tooltip>

            </Flex>

            <UserAdminFilterModal
                open={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleFilterApply}
                initialFilters={currentFilters}
            />
            <UserAdminAddModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </>
    );
};