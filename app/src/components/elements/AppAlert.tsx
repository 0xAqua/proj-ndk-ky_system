import { Alert } from "@chakra-ui/react";

export type AlertItem = {
    status: "info" | "success" | "error" | "warning";
    title?: string;
    message: string;
};

export const AppAlert = ({ status, title, message }: AlertItem) => {
    return (
        <Alert.Root status={status}>
            <Alert.Indicator />
            <Alert.Content>
                {title && <Alert.Title>{title}</Alert.Title>}
                <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
        </Alert.Root>
    );
};
