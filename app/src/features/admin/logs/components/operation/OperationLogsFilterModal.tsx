
import { Button, Box, Heading, VStack, HStack, Text } from "@chakra-ui/react";
import { PiFunnel, PiArrowCounterClockwise } from "react-icons/pi";
import {
    DialogRoot,
    DialogContent,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import Select from "react-select";

// 操作履歴用のフィルター型
export interface OperationLogFilterConditions {
    actions: string[];
    status: string[];
    user: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    onApply: (filters: OperationLogFilterConditions) => void;
    initialFilters?: OperationLogFilterConditions;
}

// 操作種別の定義
const ACTION_OPTIONS = [
    { value: "CREATE", label: "作成" },
    { value: "UPDATE", label: "更新" },
    { value: "DELETE", label: "削除" },
    { value: "LOGIN", label: "ログイン" },
    { value: "EXPORT", label: "エクスポート" },
];

// ステータスの定義
const STATUS_OPTIONS = [
    { value: "success", label: "成功" },
    { value: "failure", label: "失敗" },
];

const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderRadius: "8px",
        background: "#faf9f7",
        fontSize: "14px",
    }),
};

export const OperationLogsFilterModal = ({ open, onClose, onApply, initialFilters }: Props) => {
    const [actions, setActions] = useState<string[]>(initialFilters?.actions || []);
    const [status, setStatus] = useState<string[]>(initialFilters?.status || []);

    useEffect(() => {
        if (open && initialFilters) {
            setActions(initialFilters.actions || []);
            setStatus(initialFilters.status || []);
        }
    }, [open, initialFilters]);

    const handleApply = () => {
        onApply({ actions, status, user: [] }); // ユーザー絞り込みは必要に応じて追加
        onClose();
    };

    const handleReset = () => {
        setActions([]);
        setStatus([]);
    };

    const isFilterActive = actions.length > 0 || status.length > 0;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent maxW="480px" borderRadius="xl" bg="#faf9f7">
                <Box bg="blue.50" borderBottomWidth="1px" borderColor="blue.100" p={5} borderTopRadius="xl">
                    <HStack gap={3}>
                        <Box bg="blue.500" color="white" p={2.5} borderRadius="lg">
                            <PiFunnel size={20} />
                        </Box>
                        <Heading size="lg" color="gray.900">操作履歴 フィルター</Heading>
                    </HStack>
                </Box>

                <DialogCloseTrigger top={5} right={5} />

                <DialogBody p={6} bg="#faf9f7">
                    <VStack gap={5} align="stretch">
                        {/* 操作種別 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>操作種別</Text>
                            <Select
                                isMulti
                                options={ACTION_OPTIONS}
                                value={ACTION_OPTIONS.filter((opt) => actions.includes(opt.value))}
                                onChange={(selected) => setActions(selected.map((s) => s.value))}
                                placeholder="操作を選択..."
                                styles={customSelectStyles}
                                closeMenuOnSelect={false}
                            />
                        </Box>

                        {/* ステータス */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>実行結果</Text>
                            <Select
                                isMulti
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.filter((opt) => status.includes(opt.value))}
                                onChange={(selected) => setStatus(selected.map((s) => s.value))}
                                placeholder="結果を選択..."
                                styles={customSelectStyles}
                                closeMenuOnSelect={false}
                            />
                        </Box>
                    </VStack>
                </DialogBody>

                <DialogFooter p={6} borderTopWidth="1px" borderColor="gray.100" bg="#faf9f7">
                    <HStack gap={3} width="full" justify="space-between">
                        <Button variant="ghost" onClick={handleReset} disabled={!isFilterActive}>
                            <PiArrowCounterClockwise size={12} style={{ marginRight: '4px' }} />
                            リセット
                        </Button>
                        <HStack gap={3}>
                            <Button variant="outline" onClick={onClose}>キャンセル</Button>
                            <Button bg="blue.500" color="white" onClick={handleApply} _hover={{ bg: "blue.600" }}>適用</Button>
                        </HStack>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};