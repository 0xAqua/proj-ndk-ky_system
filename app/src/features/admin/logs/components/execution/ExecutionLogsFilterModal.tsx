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

// 実行履歴用のフィルター型
export interface ExecutionLogFilterConditions {
    startDate: string;
    endDate: string;
    status: string[];
    jobName: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onApply: (filters: ExecutionLogFilterConditions) => void;
    initialFilters?: ExecutionLogFilterConditions;
}

// ステータスの定義
const STATUS_OPTIONS = [
    { value: "completed", label: "完了" },
    { value: "running", label: "実行中" },
    { value: "failed", label: "エラー" },
];

const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderRadius: "8px",
        background: "#faf9f7",
        fontSize: "14px",
    }),
};

export const ExecutionLogsFilterModal = ({ open, onClose, onApply, initialFilters }: Props) => {
    const [startDate, setStartDate] = useState(initialFilters?.startDate || "");
    const [endDate, setEndDate] = useState(initialFilters?.endDate || "");
    const [status, setStatus] = useState<string[]>(initialFilters?.status || []);
    const [jobName, setJobName] = useState(initialFilters?.jobName || "");

    useEffect(() => {
        if (open && initialFilters) {
            setStartDate(initialFilters.startDate || "");
            setEndDate(initialFilters.endDate || "");
            setStatus(initialFilters.status || []);
            setJobName(initialFilters.jobName || "");
        }
    }, [open, initialFilters]);

    const handleApply = () => {
        onApply({ startDate, endDate, status, jobName });
        onClose();
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
        setStatus([]);
        setJobName("");
    };

    const isFilterActive = startDate || endDate || status.length > 0 || jobName;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent maxW="480px" borderRadius="xl" bg="#faf9f7">
                <Box bg="blue.50" borderBottomWidth="1px" borderColor="blue.100" p={5} borderTopRadius="xl">
                    <HStack gap={3}>
                        <Box bg="blue.500" color="white" p={2.5} borderRadius="lg">
                            <PiFunnel size={20} />
                        </Box>
                        <Heading size="lg" color="gray.900">実行履歴 フィルター</Heading>
                    </HStack>
                </Box>

                <DialogCloseTrigger top={5} right={5} />

                <DialogBody p={6} bg="#faf9f7">
                    <VStack gap={5} align="stretch">
                        {/* 期間指定 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>実行開始日</Text>
                            <HStack>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} bg="#faf9f7" />
                                <span style={{ fontSize: '14px' }}>～</span>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} bg="#faf9f7" />
                            </HStack>
                        </Box>

                        {/* ジョブ名 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>ジョブ名</Text>
                            <Input
                                placeholder="例: VQ_Generation_Job"
                                value={jobName}
                                onChange={(e) => setJobName(e.target.value)}
                                bg="#faf9f7"
                            />
                        </Box>

                        {/* ステータス */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>ステータス</Text>
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