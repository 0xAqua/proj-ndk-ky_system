import { Button, Box, Input, Heading, VStack, HStack, Text } from "@chakra-ui/react";
import { PiX } from "react-icons/pi";
import { Field } from "@/components/ui/field";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useCreateUser } from "@/features/admin/users/hooks/useAdminUsers";
import { PiCheckBold, PiXBold } from "react-icons/pi";
import {useNotification} from "@/hooks/useNotification.ts";

interface UserAdminAddModalProps {
    open: boolean;
    onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UserAdminAddModal = ({ open, onClose }: UserAdminAddModalProps) => {
    const { mutate, isPending } = useCreateUser();

    const [familyName, setFamilyName] = useState("");
    const [givenName, setGivenName] = useState("");
    const [department, setDepartment] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"admin" | "user">("user");
    const notify = useNotification();

    const resetForm = () => {
        setFamilyName("");
        setGivenName("");
        setDepartment("");
        setEmail("");
        setPassword("");
        setRole("user");
    };
    const validate = (): string | null => {
        if (!familyName.trim()) return "姓を入力してください";
        if (!givenName.trim()) return "名を入力してください";
        if (!department.trim()) return "部署を入力してください";
        if (!email.trim()) return "Emailを入力してください";

        if (!EMAIL_REGEX.test(email)) {
            return "正しいメールアドレス形式で入力してください";
        }

        if (!password) return "パスワードを入力してください";

        if (password.length < 10 || password.length > 64) {
            return "パスワードは10文字以上64文字以下で入力してください";
        }

        return null;
    };
    const passwordChecks = {
        length: password.length >= 10 && password.length <= 64,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        digit: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };
    const PasswordCheckItem = ({
                                   ok,
                                   label,
                               }: {
        ok: boolean;
        label: string;
    }) => (
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
                {ok ? (
                    <PiCheckBold size={10} color="white" />
                ) : (
                    <PiXBold size={12} color="gray" />
                )}
            </Box>

            <Text fontSize="xs" color={ok ? "green.600" : "gray.500"}>
                {label}
            </Text>
        </HStack>
    );

    const handleSubmit = () => {
        const error = validate();
        if (error) {
            notify.error(error);
            return;
        }

        mutate(
            {
                email,
                password,
                family_name: familyName,
                given_name: givenName,
                departments: { main: department },
                role,
            },
            {
                onSuccess: () => {
                    notify.success("ユーザーを追加しました"); // ← グローバル通知
                    resetForm();
                    onClose();
                },
                onError: (error: any) => {
                    const message =
                        error?.response?.data?.message ??
                        "登録に失敗しました。入力内容を確認してください。";

                    notify.error(message);
                },
            }
        );
    };


    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <Heading size="lg">ユーザーを追加</Heading>
                    <DialogCloseTrigger>
                        <Box
                            cursor="pointer"
                            p={1}
                            borderRadius="md"
                            _hover={{ bg: "gray.100" }}
                        >
                            <PiX />
                        </Box>
                    </DialogCloseTrigger>
                </DialogHeader>

                <DialogBody>
                    <VStack gap={4} align="stretch">
                        {/* 姓 */}
                        <Field label="姓" required>
                            <Input
                                placeholder="姓を入力"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                            />
                        </Field>

                        {/* 名 */}
                        <Field label="名" required>
                            <Input
                                placeholder="名を入力"
                                value={givenName}
                                onChange={(e) => setGivenName(e.target.value)}
                            />
                        </Field>

                        {/* 部署 */}
                        <Field label="部署" required>
                            <Input
                                placeholder="部署を入力"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </Field>

                        {/* Email */}
                        <Field label="Email" required>
                            <Input
                                type="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </Field>

                        {/* Password */}
                        <Field label="パスワード" required>
                            <Input
                                type="password"
                                placeholder="パスワードを入力"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <VStack align="start" mt={2} gap={1}>
                                <PasswordCheckItem
                                    ok={passwordChecks.length}
                                    label="10文字以上64文字以下"
                                />
                                <PasswordCheckItem
                                    ok={passwordChecks.upper}
                                    label="英大文字を含む"
                                />
                                <PasswordCheckItem
                                    ok={passwordChecks.lower}
                                    label="英小文字を含む"
                                />
                                <PasswordCheckItem
                                    ok={passwordChecks.digit}
                                    label="数字を含む"
                                />
                                <PasswordCheckItem
                                    ok={passwordChecks.symbol}
                                    label="記号を含む"
                                />
                            </VStack>
                        </Field>

                        {/* Role */}
                        <Field label="権限" required>
                            <select
                                value={role}
                                onChange={(e) =>
                                    setRole(e.target.value as "admin" | "user")
                                }
                                style={{
                                    width: "100%",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "1px solid #E2E8F0",
                                    background: "white",
                                    fontSize: "14px",
                                }}
                            >
                                <option value="admin">管理者</option>
                                <option value="user">一般ユーザー</option>
                            </select>
                        </Field>
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <HStack gap={3}>
                        <Button variant="ghost" onClick={onClose}>
                            キャンセル
                        </Button>
                        <Button
                            colorPalette="blue"
                            onClick={handleSubmit}
                            disabled={isPending}
                        >
                            追加
                        </Button>
                    </HStack>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
