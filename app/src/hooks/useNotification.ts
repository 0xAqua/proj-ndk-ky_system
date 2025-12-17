import { useContext } from "react";
import { AlertContext } from "@/providers/AlertStackProvider";

export const useNotification = () => {
    const push = useContext(AlertContext);

    if (!push) {
        throw new Error("useAlert must be used within AlertProvider");
    }

    return {
        success: (message: string, title?: string) =>
            push({ status: "success", message, title }),
        error: (message: string, title?: string) =>
            push({ status: "error", message, title }),
        info: (message: string, title?: string) =>
            push({ status: "info", message, title }),
        warning: (message: string, title?: string) =>
            push({ status: "warning", message, title }),
    };
};
