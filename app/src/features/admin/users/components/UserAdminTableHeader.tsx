import React, { useState } from "react";
import {Flex, Box, Input, Button} from "@chakra-ui/react";
import {PiMagnifyingGlass, PiFunnel, PiPlus, PiArrowCounterClockwise} from "react-icons/pi";
import {type FilterConditions, UserAdminFilterModal} from "./UserAdminFilterModal";
import {UserAdminAddModal} from "@/features/admin/users/components/UserAdminAddModal";
import {Tooltip} from "@/components/ui/tooltip"

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
        sortBy: undefined,      // ← 追加
        sortOrder: undefined,   // ← 追加
    });

    const handleFilterApply = (filters: FilterConditions) => {
        setCurrentFilters(filters);
        onFilterChange(filters);
    };

    // フィルターまたはソートがかかっているかチェック
    const hasActiveFilters =
        currentFilters.status.length > 0 ||
        currentFilters.departments.length > 0 ||
        currentFilters.role.length > 0 ||
        currentFilters.sortBy !== undefined;  // ← 追加

    // フィルターとソートをリセット
    const handleFilterReset = () => {
        const emptyFilters: FilterConditions = {
            status: [],
            departments: [],
            role: [],
            sortBy: undefined,      // ← 追加
            sortOrder: undefined,   // ← 追加
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
                wrap="wrap"
                gap={4}
            >
                {/* 左側：検索 + フィルター */}
                <Flex align="center" gap={4} wrap="wrap">
                    {/* 検索ボックス */}
                    <Box position="relative" w="300px">
                        <Box
                            position="absolute"
                            left={3}
                            top="50%"
                            transform="translateY(-50%)"
                            zIndex={1}
                            pointerEvents="none"
                            fontSize="xl"
                        >
                            <PiMagnifyingGlass color="gray" />
                        </Box>
                        <Input
                            placeholder="名前やメールで検索..."
                            pl={10}
                            value={searchText}
                            onChange={handleSearchChange}
                        />
                    </Box>

                    {/* フィルターボタン */}
                    <Tooltip
                        content="フィルター"
                        positioning={{ placement: hasActiveFilters ? "top" : "right" }}
                        showArrow
                        openDelay={0}
                    >
                        <Button
                            variant="outline"
                            aria-label="フィルター"
                            onClick={() => setIsFilterModalOpen(true)}
                            px={3}
                        >
                            <PiFunnel />
                        </Button>
                    </Tooltip>

                    {/* リセットボタン（フィルターまたはソートがかかっているときのみ表示） */}
                    {hasActiveFilters && (
                        <Tooltip
                            content="フィルターをリセット"
                            positioning={{ placement: "right" }}
                            showArrow
                            openDelay={0}
                        >
                            <Button
                                variant="outline"
                                aria-label="フィルターをリセット"
                                onClick={handleFilterReset}
                                px={3}
                                colorScheme="red"
                            >
                                <PiArrowCounterClockwise />
                            </Button>
                        </Tooltip>
                    )}
                </Flex>

                {/* 右側：ユーザー追加 */}
                <Tooltip
                    content="ユーザーを追加"
                    positioning={{ placement: "left" }}
                    showArrow
                    openDelay={0}
                >
                    <Button
                        aria-label="ユーザーを追加"
                        bg="orange.500"
                        color="white"
                        borderRadius="full"
                        minW="40px"
                        h="40px"
                        p={0}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        _hover={{ bg: "orange.600" }}
                        _active={{ bg: "orange.700" }}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <PiPlus />
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