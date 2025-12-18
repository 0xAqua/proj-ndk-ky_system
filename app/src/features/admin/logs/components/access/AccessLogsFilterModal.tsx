
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

// アクセスログ用のフィルター型
export interface AccessLogFilterConditions {
    startDate: string;
    endDate: string;
    ipAddress: string;
    destination: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    onApply: (filters: AccessLogFilterConditions) => void;
    initialFilters?: AccessLogFilterConditions;
}

const DESTINATION_OPTIONS = [
    { value: "/admin/users", label: "/admin/users (ユーザー管理)" },
    { value: "/admin/settings", label: "/admin/settings (設定)" },
    { value: "/api/v1/data", label: "/api/v1/data (API)" },
];

// UserAdminFilterModal と同じスタイル
const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderRadius: "8px",
        background: "#faf9f7",
        fontSize: "14px",
    }),
};

export const AccessLogsFilterModal = ({ open, onClose, onApply, initialFilters }: Props) => {
    const [startDate, setStartDate] = useState(initialFilters?.startDate || "");
    const [endDate, setEndDate] = useState(initialFilters?.endDate || "");
    const [ipAddress, setIpAddress] = useState(initialFilters?.ipAddress || "");
    const [destination, setDestination] = useState<string[]>(initialFilters?.destination || []);

    useEffect(() => {
        if (open && initialFilters) {
            setStartDate(initialFilters.startDate || "");
            setEndDate(initialFilters.endDate || "");
            setIpAddress(initialFilters.ipAddress || "");
            setDestination(initialFilters.destination || []);
        }
    }, [open, initialFilters]);

    const handleApply = () => {
        onApply({ startDate, endDate, ipAddress, destination });
        onClose();
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
        setIpAddress("");
        setDestination([]);
    };

    const isFilterActive = startDate || endDate || ipAddress || destination.length > 0;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent maxW="480px" borderRadius="xl" bg="#faf9f7">
                <Box bg="blue.50" borderBottomWidth="1px" borderColor="blue.100" p={5} borderTopRadius="xl">
                    <HStack gap={3}>
                        <Box bg="blue.500" color="white" p={2.5} borderRadius="lg">
                            <PiFunnel size={20} />
                        </Box>
                        <Heading size="lg" color="gray.900">アクセスログ フィルター</Heading>
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

                        {/* IPアドレス */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>IPアドレス</Text>
                            <Input
                                placeholder="例: 192.168.1.1"
                                value={ipAddress}
                                onChange={(e) => setIpAddress(e.target.value)}
                                bg="#faf9f7"
                            />
                        </Box>

                        {/* アクセス先 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>アクセス先</Text>
                            <Select
                                isMulti
                                options={DESTINATION_OPTIONS}
                                value={DESTINATION_OPTIONS.filter((opt) => destination.includes(opt.value))}
                                onChange={(selected) => setDestination(selected.map((s) => s.value))}
                                placeholder="URLを選択..."
                                styles={customSelectStyles}
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