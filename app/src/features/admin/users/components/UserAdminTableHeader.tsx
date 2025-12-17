import React, { useState } from "react";
import {Flex, Box, Input, Button} from "@chakra-ui/react";
import {PiMagnifyingGlass, PiFunnel, PiPlus} from "react-icons/pi";
import { UserAdminFilterModal } from "./UserAdminFilterModal";
import {UserAdminAddModal} from "@/features/admin/users/components/UserAdminAddModal";
import {Tooltip} from "@/components/ui/tooltip"

type UserAdminFiltersProps = {
    onSearch: (text: string) => void; // 検索文字が変わったときに呼ばれる関数
};

export const UserAdminTableHeader = ({ onSearch }: UserAdminFiltersProps) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // 1. 検索ワードを管理するStateを作成
    const [searchText, setSearchText] = useState("");

    // 2. 入力欄が変わったときの処理
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value); // 自分のStateを更新（表示用）
        onSearch(value);      // 親コンポーネントに通知（フィルタ処理用）
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
                        positioning={{ placement: "right" }}
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
            />
            <UserAdminAddModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />


        </>
    );
};