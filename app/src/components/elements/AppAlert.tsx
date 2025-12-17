import { Alert, CloseButton } from "@chakra-ui/react";

export type AlertItem = {
    status: "info" | "success" | "error" | "warning";
    title?: string;
    message: string;
};

type AppAlertProps = AlertItem & {
    onClose?: () => void;
};

export const AppAlert = ({ status, title, message, onClose }: AppAlertProps) => {
    return (
        <Alert.Root status={status} position="relative">
            <Alert.Indicator />
            <Alert.Content>
                {title && <Alert.Title>{title}</Alert.Title>}
                <Alert.Description>{message}</Alert.Description>
            </Alert.Content>
            {onClose && (
                <CloseButton
                    position="absolute"
                    top={2}
                    right={2}
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                />
            )}
        </Alert.Root>
    );
};