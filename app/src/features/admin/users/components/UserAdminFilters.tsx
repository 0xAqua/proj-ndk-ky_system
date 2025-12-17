import { useState } from "react";
import { Flex, Box, Input, Button } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel } from "react-icons/pi";
import { UserAdminFilterModal } from "./UserAdminFilterModal";

// 親コンポーネントに検索ワードを渡すためのPropsを定義
type UserAdminFiltersProps = {
    onSearch: (text: string) => void; // 検索文字が変わったときに呼ばれる関数
};

export const UserAdminFilters = ({ onSearch }: UserAdminFiltersProps) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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
            <Flex mb={6} gap={4} bg="white" p={4} borderRadius="xl" shadow="sm" align="center" wrap="wrap">
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
                        // 3. Stateと紐付け
                        value={searchText}
                        onChange={handleSearchChange}
                    />
                </Box>

                {/* フィルターボタン */}
                <Button
                    variant="outline"
                    onClick={() => setIsFilterModalOpen(true)}
                >
                    <PiFunnel />
                    フィルター
                </Button>
            </Flex>

            <UserAdminFilterModal
                open={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
            />
        </>
    );
};