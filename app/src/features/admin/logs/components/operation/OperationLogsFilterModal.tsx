import { Button, Box, Heading, VStack, HStack, Text, Input } from "@chakra-ui/react";
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

export interface OperationLogFilterConditions {
    startDate: string;
    endDate: string;
    category: string[];
    action: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    onApply: (filters: OperationLogFilterConditions) => void;
    initialFilters?: OperationLogFilterConditions;
}

const CATEGORY_OPTIONS = [
    { value: "USER", label: "ユーザー管理" },
    { value: "VQ", label: "VQ実行" },
    { value: "CONFIG", label: "設定" },
    { value: "DATA", label: "データ" },
];

const ACTION_OPTIONS = [
    { value: "CREATE", label: "作成" },
    { value: "UPDATE", label: "更新" },
    { value: "DELETE", label: "削除" },
    { value: "VIEW", label: "閲覧" },
    { value: "EXECUTE", label: "実行" },
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
    const [startDate, setStartDate] = useState(initialFilters?.startDate || "");
    const [endDate, setEndDate] = useState(initialFilters?.endDate || "");
    const [category, setCategory] = useState<string[]>(initialFilters?.category || []);
    const [action, setAction] = useState<string[]>(initialFilters?.action || []);

    useEffect(() => {
        if (open && initialFilters) {
            setStartDate(initialFilters.startDate || "");
            setEndDate(initialFilters.endDate || "");
            setCategory(initialFilters.category || []);
            setAction(initialFilters.action || []);
        }
    }, [open, initialFilters]);

    const handleApply = () => {
        onApply({ startDate, endDate, category, action });
        onClose();
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
        setCategory([]);
        setAction([]);
    };

    const isFilterActive = startDate || endDate || category.length > 0 || action.length > 0;

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
                        {/* 期間指定 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>期間指定</Text>
                            <HStack>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} bg="#faf9f7" />
                                <Text>～</Text>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} bg="#faf9f7" />
                            </HStack>
                        </Box>

                        {/* カテゴリ */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>カテゴリ</Text>
                            <Select
                                isMulti
                                options={CATEGORY_OPTIONS}
                                value={CATEGORY_OPTIONS.filter((opt) => category.includes(opt.value))}
                                onChange={(selected) => setCategory(selected.map((s) => s.value))}
                                placeholder="カテゴリを選択..."
                                styles={customSelectStyles}
                                closeMenuOnSelect={false}
                            />
                        </Box>

                        {/* アクション */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>操作種別</Text>
                            <Select
                                isMulti
                                options={ACTION_OPTIONS}
                                value={ACTION_OPTIONS.filter((opt) => action.includes(opt.value))}
                                onChange={(selected) => setAction(selected.map((s) => s.value))}
                                placeholder="操作を選択..."
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