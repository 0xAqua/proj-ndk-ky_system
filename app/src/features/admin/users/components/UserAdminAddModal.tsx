import { Button, Box, Input, Heading, VStack, HStack, Text, Spinner, Stack, IconButton } from "@chakra-ui/react";
import { PiCheckCircle, PiUserPlus, PiArrowsClockwise, PiCopy, PiCheck, PiCheckBold, PiXBold } from "react-icons/pi";
import { Field } from "@/components/ui/field";
import { Tooltip } from "@/components/ui/tooltip";
import {
    DialogRoot,
    DialogContent,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useCreateUser } from "@/features/admin/users/hooks/useAdminUsers";
import { useNotification } from "@/hooks/useNotification.ts";
import { motion } from "framer-motion";
import { generateSecurePassword } from "@/features/admin/users/utils/passwordGenerator";
import Select from "react-select";

interface UserAdminAddModalProps {
    open: boolean;
    onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 部署の定義（DEPT#1 共通 はシステムで自動付与するため選択肢から除外）
const DEPARTMENTS = [
    { code: "DEPT#2", name: "ネットワーク" },
    { code: "DEPT#3", name: "モバイル" },
    { code: "DEPT#4", name: "土木" },
    { code: "DEPT#5", name: "アクセス" },
];

const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        padding: "2px",
        borderRadius: "8px",
        border: "1px solid #E2E8F0",
        background: "#faf9f7",
        fontSize: "14px",
        "&:hover": { borderColor: "#CBD5E0" },
    }),
    menu: (base: any) => ({ ...base, background: "#faf9f7", borderRadius: "8px" }),
    option: (base: any, state: any) => ({
        ...base,
        background: state.isSelected ? "#FED7AA" : state.isFocused ? "#FFEDD5" : "#faf9f7",
        color: "#1A202C",
        cursor: "pointer",
    }),
    multiValue: (base: any) => ({ ...base, background: "#FED7AA", borderRadius: "6px" }),
    multiValueLabel: (base: any) => ({ ...base, color: "#7C2D12" }),
    multiValueRemove: (base: any) => ({
        ...base,
        color: "#7C2D12",
        "&:hover": { background: "#FDBA74", color: "#7C2D12" },
    }),
};

const departmentOptions = DEPARTMENTS.map((dept) => ({
    value: dept.code,
    label: dept.name,
}));

export const UserAdminAddModal = ({ open, onClose }: UserAdminAddModalProps) => {
    const { mutate, isPending } = useCreateUser();
    const [isSuccess, setIsSuccess] = useState(false);

    // 名前関連のStateを削除
    const [departments, setDepartments] = useState<string[]>([]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"admin" | "user">("user");
    const [copied, setCopied] = useState(false);
    const notify = useNotification();

    const resetForm = () => {
        setDepartments([]);
        setEmail("");
        setPassword("");
        setRole("user");
        setCopied(false);
    };

    const validate = (): string | null => {
        if (!email.trim()) return "Emailを入力してください";
        if (!EMAIL_REGEX.test(email)) return "正しいメールアドレス形式で入力してください";
        if (departments.length === 0) return "部署を少なくとも1つ選択してください";
        if (!password) return "パスワードを入力してください";
        if (password.length < 10 || password.length > 64) return "パスワードは10文字以上64文字以下で入力してください";
        return null;
    };

    const passwordChecks = {
        length: password.length >= 10 && password.length <= 64,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };

    const PasswordCheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
        <HStack gap={2} align="center">
            <Box
                w="16px"
                h="16px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={ok ? "green.500" : "transparent"}
            >
                {ok ? <PiCheckBold size={10} color="white" /> : <PiXBold size={12} color="gray" />}
            </Box>
            <Text fontSize="xs" color={ok ? "green.600" : "gray.500"}>{label}</Text>
        </HStack>
    );

    const handleGeneratePassword = () => {
        setPassword(generateSecurePassword(16));
        notify.success("パスワードを生成しました");
    };

    const copyPassword = async () => {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            notify.success("パスワードをコピーしました");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            notify.error("コピーに失敗しました");
        }
    };

    const handleSubmit = () => {
        const error = validate();
        if (error) {
            notify.error(error);
            return;
        }

        const departmentMap = DEPARTMENTS.reduce((acc, dept) => {
            if (departments.includes(dept.code)) {
                acc[dept.code] = dept.name;
            }
            return acc;
        }, {} as Record<string, string>);

        mutate(
            {
                email,
                password,
                departments: departmentMap,
                role,
            },
            {
                onSuccess: () => {
                    setIsSuccess(true);
                    notify.success("ユーザーを追加しました");
                    setTimeout(() => {
                        resetForm();
                        setIsSuccess(false);
                        onClose();
                    }, 1500);
                },
            }
        );
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <DialogContent maxW="500px" borderRadius="xl" bg="#faf9f7">
                <Box bg="orange.50" borderBottomWidth="1px" borderColor="orange.100" p={5} borderTopRadius="xl">
                    <HStack gap={3}>
                        <Box bg="orange.500" color="white" p={2.5} borderRadius="lg">
                            <PiUserPlus size={20} strokeWidth={2} />
                        </Box>
                        <Heading size="lg" color="gray.900">ユーザー登録</Heading>
                    </HStack>
                </Box>

                <DialogCloseTrigger top={5} right={5} />

                <DialogBody p={6} bg="#faf9f7">
                    <VStack gap={6} align="stretch">
                        <Stack gap={4}>
                            <Field label="メールアドレス" required>
                                <Input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    size="md"
                                    bg="#faf9f7"
                                />
                            </Field>

                            <Field label="所属部署" required>
                                <Box w="full">
                                    <Select
                                        isMulti
                                        options={departmentOptions}
                                        value={departmentOptions.filter((opt) => departments.includes(opt.value))}
                                        onChange={(selected) => setDepartments(selected.map((s) => s.value))}
                                        placeholder="部署を選択..."
                                        styles={customSelectStyles}
                                        noOptionsMessage={() => "選択肢がありません"}
                                        closeMenuOnSelect={false}
                                    />
                                </Box>
                                <Text fontSize="xs" color="gray.500" mt={1}>※「共通」部署は自動的に付与されます</Text>
                            </Field>

                            <Field label="初期パスワード" required>
                                <HStack gap={2} width="full">
                                    <Input
                                        type="password"
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        size="md"
                                        flex={1}
                                        bg="#faf9f7"
                                    />
                                    <Tooltip content="自動生成"><IconButton aria-label="Gen" onClick={handleGeneratePassword} variant="outline" size="md"><PiArrowsClockwise size={18} /></IconButton></Tooltip>
                                    <Tooltip content="コピー"><IconButton aria-label="Copy" onClick={copyPassword} variant="outline" size="md" disabled={!password} colorPalette={copied ? "green" : "gray"}>{copied ? <PiCheck size={18} /> : <PiCopy size={18} />}</IconButton></Tooltip>
                                </HStack>

                                <Box mt={3} p={3} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
                                    <VStack align="start" gap={1.5}>
                                        <PasswordCheckItem ok={passwordChecks.length} label="10-64文字" />
                                        <PasswordCheckItem ok={passwordChecks.upper} label="英大文字" />
                                        <PasswordCheckItem ok={passwordChecks.lower} label="英小文字" />
                                        <PasswordCheckItem ok={passwordChecks.digit} label="数字" />
                                        <PasswordCheckItem ok={passwordChecks.symbol} label="記号" />
                                    </VStack>
                                </Box>
                            </Field>

                            <Field label="権限ロール" required>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #E2E8F0",
                                        background: "#faf9f7",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                    }}
                                >
                                    <option value="user">一般ユーザー</option>
                                    <option value="admin">管理者</option>
                                </select>
                            </Field>
                        </Stack>
                    </VStack>
                </DialogBody>

                <DialogFooter p={6} borderTopWidth="1px" borderColor="gray.100" bg="#faf9f7">
                    <HStack gap={3} width="full" justify="flex-end">
                        <Button variant="outline" onClick={onClose} size="md">キャンセル</Button>
                        <Button bg="orange.500" color="white" onClick={handleSubmit} disabled={isPending || isSuccess} size="md" _hover={{ bg: "orange.600" }} minW="100px">
                            {isPending ? <Spinner size="sm" /> : isSuccess ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><PiCheckCircle size={20} /></motion.div> : "登録する"}
                        </Button>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};