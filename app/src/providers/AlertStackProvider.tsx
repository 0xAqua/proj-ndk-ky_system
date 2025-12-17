import React, { createContext, useCallback, useState } from "react";
import { AppAlert } from "@/components/elements/AppAlert";
import type { AlertItem } from "@/components/elements/AppAlert";
import { Box, VStack } from "@chakra-ui/react";

type AlertWithId = AlertItem & { id: string };
type PushFn = (alert: AlertItem) => void;

export const AlertContext = createContext<PushFn | null>(null);

const MAX = 4;
const AUTO_CLOSE = 4000;

export const AlertStackProvider = ({ children }: { children: React.ReactNode }) => {
    const [alerts, setAlerts] = useState<AlertWithId[]>([]);

    const push = useCallback((alert: AlertItem) => {
        const id = crypto.randomUUID();

        setAlerts(prev => {
            const next = [...prev, { ...alert, id }];
            return next.length > MAX ? next.slice(1) : next;
        });

        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, AUTO_CLOSE);
    }, []);

    return (
        <AlertContext.Provider value={push}>
            {children}

            <Box
                position="fixed"
                top={4}
                right={4}
                zIndex={2000}
                maxW="420px"
                w="calc(100% - 32px)"
            >
                <VStack gap={3} align="stretch">
                    {alerts.map(a => (
                        <AppAlert
                            key={a.id}
                            status={a.status}
                            title={a.title}
                            message={a.message}
                        />
                    ))}
                </VStack>
            </Box>

        </AlertContext.Provider>
    );
};
