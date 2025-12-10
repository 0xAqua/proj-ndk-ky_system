import { VStack, Input, Button, Field } from "@chakra-ui/react";
import React from "react";

type Props = {
    username: string;
    password: string;
    isLoading: boolean;
    onUsernameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
};

export const CredentialsForm = ({
                                    username,
                                    password,
                                    isLoading,
                                    onUsernameChange,
                                    onPasswordChange,
                                    onSubmit
                                }: Props) => {
    return (
        <form onSubmit={onSubmit} style={{ width: '100%' }}>
            <VStack gap={4} width="100%">
                <Field.Root w="full">
                    <Input
                        name="email"
                        autoComplete="email"
                        maxLength={255}
                        placeholder="メールアドレス"
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                    />
                </Field.Root>

                <Field.Root w="full">
                    <Input
                        name="password"
                        type="password"
                        maxLength={64}
                        autoComplete="current-password"
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                    />
                </Field.Root>

                <Button
                    type="submit"
                    w="full"
                    colorPalette="blue"
                    loading={isLoading}
                    loadingText="認証中..."
                >
                    次へ
                </Button>
            </VStack>
        </form>
    );
};
