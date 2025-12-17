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

export interface FilterConditions {
    status: string[];
    departments: string[];
    role: string[];
    sortBy?: string; // ソート項目を追加
    sortOrder?: "asc" | "desc"; // ソート順を追加
}

interface UserAdminFilterModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (filters: FilterConditions) => void;
    initialFilters?: FilterConditions;
}

// 部署の定義（追加モーダルと同じ）
const DEPARTMENTS = [
    { code: "ACCESS", name: "アクセス" },
    { code: "NETWORK", name: "ネットワーク" },
    { code: "CIVIL", name: "土木" },
    { code: "MOBILE", name: "モバイル" },
];

// ステータスの定義
const STATUSES = [
    { value: "ACTIVE", label: "有効" },
    { value: "INACTIVE", label: "無効" },
    { value: "LOCKED", label: "ロック" },
];

// 権限の定義
const ROLES = [
    { value: "admin", label: "管理者" },
    { value: "user", label: "一般ユーザー" },
];

// ソートオプションの定義
const SORT_OPTIONS = [
    { value: "name-asc", label: "名前（昇順）", sortBy: "name", sortOrder: "asc" },
    { value: "name-desc", label: "名前（降順）", sortBy: "name", sortOrder: "desc" },
    { value: "email-asc", label: "メール（昇順）", sortBy: "email", sortOrder: "asc" },
    { value: "email-desc", label: "メール（降順）", sortBy: "email", sortOrder: "desc" },
    { value: "createdAt-desc", label: "作成日（新しい順）", sortBy: "createdAt", sortOrder: "desc" },
    { value: "createdAt-asc", label: "作成日（古い順）", sortBy: "createdAt", sortOrder: "asc" },
];

// react-select用のスタイル（青系テーマ）
const customSelectStyles = {
    container: (base: any) => ({
        ...base,
        width: "100%",
    }),
    control: (base: any) => ({
        ...base,
        padding: "2px",
        borderRadius: "8px",
        border: "1px solid #E2E8F0",
        background: "#faf9f7",
        fontSize: "14px",
        "&:hover": {
            borderColor: "#CBD5E0",
        },
    }),
    menu: (base: any) => ({
        ...base,
        background: "#faf9f7",
        borderRadius: "8px",
    }),
    option: (base: any, state: any) => ({
        ...base,
        background: state.isSelected ? "#BFDBFE" : state.isFocused ? "#DBEAFE" : "#faf9f7",
        color: "#1A202C",
        cursor: "pointer",
    }),
    multiValue: (base: any) => ({
        ...base,
        background: "#BFDBFE",
        borderRadius: "6px",
    }),
    multiValueLabel: (base: any) => ({
        ...base,
        color: "#1E40AF",
    }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: "#1E40AF",
        "&:hover": {
            background: "#93C5FD",
            color: "#1E40AF",
        },
    }),
    singleValue: (base: any) => ({
        ...base,
        color: "#1A202C",
    }),
};

const departmentOptions = DEPARTMENTS.map((dept) => ({
    value: dept.code,
    label: dept.name,
}));

export const UserAdminFilterModal = ({
                                         open,
                                         onClose,
                                         onApply,
                                         initialFilters
                                     }: UserAdminFilterModalProps) => {
    const [status, setStatus] = useState<string[]>(initialFilters?.status || []);
    const [departments, setDepartments] = useState<string[]>(initialFilters?.departments || []);
    const [role, setRole] = useState<string[]>(initialFilters?.role || []);
    const [sortOption, setSortOption] = useState<string | null>(
        initialFilters?.sortBy && initialFilters?.sortOrder
            ? `${initialFilters.sortBy}-${initialFilters.sortOrder}`
            : null
    );

    // モーダルが開いたときに初期値をセット
    useEffect(() => {
        if (open && initialFilters) {
            setStatus(initialFilters.status || []);
            setDepartments(initialFilters.departments || []);
            setRole(initialFilters.role || []);
            if (initialFilters.sortBy && initialFilters.sortOrder) {
                setSortOption(`${initialFilters.sortBy}-${initialFilters.sortOrder}`);
            } else {
                setSortOption(null);
            }
        }
    }, [open, initialFilters]);

    const handleApply = () => {
        const selectedSort = SORT_OPTIONS.find(opt => opt.value === sortOption);
        onApply({
            status,
            departments,
            role,
            sortBy: selectedSort?.sortBy,
            sortOrder: selectedSort?.sortOrder as "asc" | "desc" | undefined,
        });
        onClose();
    };

    const handleReset = () => {
        setStatus([]);
        setDepartments([]);
        setRole([]);
        setSortOption(null);
    };

    const isFilterActive = status.length > 0 || departments.length > 0 || role.length > 0 || sortOption !== null;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent maxW="480px" borderRadius="xl" bg="#faf9f7">
                {/* 青テーマのヘッダー */}
                <Box
                    bg="blue.50"
                    borderBottomWidth="1px"
                    borderColor="blue.100"
                    p={5}
                    borderTopRadius="xl"
                >
                    <HStack gap={3}>
                        <Box bg="blue.500" color="white" p={2.5} borderRadius="lg">
                            <PiFunnel size={20} strokeWidth={2} />
                        </Box>
                        <Heading size="lg" color="gray.900">
                            フィルター・ソート条件
                        </Heading>
                    </HStack>
                </Box>

                <DialogCloseTrigger top={5} right={5} />

                <DialogBody p={6} bg="#faf9f7">
                    <VStack gap={5} align="stretch">
                        {/* ソート */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                                並び替え
                            </Text>
                            <Select
                                isClearable
                                options={SORT_OPTIONS}
                                value={SORT_OPTIONS.find(opt => opt.value === sortOption) || null}
                                onChange={(selected) => setSortOption(selected?.value || null)}
                                placeholder="並び替え順を選択..."
                                styles={customSelectStyles}
                                noOptionsMessage={() => "選択肢がありません"}
                            />
                        </Box>

                        {/* ステータス */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                                ステータス
                            </Text>
                            <Select
                                isMulti
                                options={STATUSES}
                                value={STATUSES.filter((s) => status.includes(s.value))}
                                onChange={(selected) => setStatus(selected.map((s) => s.value))}
                                placeholder="ステータスを選択..."
                                styles={customSelectStyles}
                                noOptionsMessage={() => "選択肢がありません"}
                                closeMenuOnSelect={false}
                            />
                        </Box>

                        {/* 部署 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                                部署
                            </Text>
                            <Select
                                isMulti
                                options={departmentOptions}
                                value={departmentOptions.filter((d) => departments.includes(d.value))}
                                onChange={(selected) => setDepartments(selected.map((s) => s.value))}
                                placeholder="部署を選択..."
                                styles={customSelectStyles}
                                noOptionsMessage={() => "選択肢がありません"}
                                closeMenuOnSelect={false}
                            />
                        </Box>

                        {/* 権限 */}
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                                権限
                            </Text>
                            <Select
                                isMulti
                                options={ROLES}
                                value={ROLES.filter((r) => role.includes(r.value))}
                                onChange={(selected) => setRole(selected.map((s) => s.value))}
                                placeholder="権限を選択..."
                                styles={customSelectStyles}
                                noOptionsMessage={() => "選択肢がありません"}
                                closeMenuOnSelect={false}
                            />
                        </Box>

                        {/* アクティブなフィルター数の表示 */}
                        {isFilterActive && (
                            <Box
                                p={3}
                                bg="blue.50"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="blue.100"
                            >
                                <Text fontSize="xs" color="blue.700">
                                    {status.length + departments.length + role.length + (sortOption ? 1 : 0)} 件の条件が設定されています
                                </Text>
                            </Box>
                        )}
                    </VStack>
                </DialogBody>

                <DialogFooter p={6} borderTopWidth="1px" borderColor="gray.100" bg="#faf9f7">
                    <HStack gap={3} width="full" justify="space-between">
                        <Button
                            variant="ghost"
                            onClick={handleReset}
                            size="md"
                            disabled={!isFilterActive}
                        >
                            <PiArrowCounterClockwise size={12} />
                            リセット
                        </Button>
                        <HStack gap={3}>
                            <Button variant="outline" onClick={onClose} size="md">
                                キャンセル
                            </Button>
                            <Button
                                bg="blue.500"
                                color="white"
                                onClick={handleApply}
                                size="md"
                                _hover={{ bg: "blue.600" }}
                                minW="100px"
                            >
                                適用
                            </Button>
                        </HStack>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};