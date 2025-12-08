import { useState } from "react";
import { Flex, Box, Input, Button } from "@chakra-ui/react";
import { PiMagnifyingGlass, PiFunnel } from "react-icons/pi";
import { UserAdminFilterModal } from "./UserAdminFilterModal";

export const UserAdminFilters = () => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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
