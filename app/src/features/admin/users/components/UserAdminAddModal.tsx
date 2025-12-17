import { Button, Box, Input, Heading, VStack, HStack } from "@chakra-ui/react";
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

interface UserAdminAddModalProps {
    open: boolean;
    onClose: () => void;
}

export const UserAdminAddModal = ({ open, onClose }: UserAdminAddModalProps) => {
    const { mutate, isPending } = useCreateUser();

    const [familyName, setFamilyName] = useState("");
    const [givenName, setGivenName] = useState("");
    const [department, setDepartment] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"admin" | "user">("user");

    const resetForm = () => {
        setFamilyName("");
        setGivenName("");
        setDepartment("");
        setEmail("");
        setPassword("");
        setRole("user");
    };

    const handleSubmit = () => {
        mutate(
            {
                email,
                password,
                family_name: familyName,
                given_name: givenName,
                departments: {
                    main: department,
                },
                role,
            },
            {
                onSuccess: () => {
                    resetForm();
                    onClose();
                },            }
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
