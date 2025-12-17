import React, { createContext, useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AppAlert } from "@/components/elements/AppAlert";
import type { AlertItem } from "@/components/elements/AppAlert";
import { Box, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";

type AlertWithId = AlertItem & { id: string };
type PushFn = (alert: AlertItem) => void;

export const AlertContext = createContext<PushFn | null>(null);

const MAX = 4;
const AUTO_CLOSE = 4000;

export const AlertStackProvider = ({ children }: { children: React.ReactNode }) => {
    const [alerts, setAlerts] = useState<AlertWithId[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // 専用コンテナを作成
        const container = document.createElement("div");
        container.id = "alert-stack-container";
        document.body.appendChild(container);
        containerRef.current = container;
        setMounted(true);

        // MutationObserverでDOMの変更を監視し、常に最後に移動
        const observer = new MutationObserver(() => {
            if (container.nextSibling) {
                document.body.appendChild(container);
            }
        });

        observer.observe(document.body, { childList: true });

        return () => {
            observer.disconnect();
            container.remove();
        };
    }, []);

    const remove = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const push = useCallback((alert: AlertItem) => {
        const id = crypto.randomUUID();

        setAlerts(prev => {
            const next = [...prev, { ...alert, id }];
            return next.length > MAX ? next.slice(1) : next;
        });

        setTimeout(() => {
            remove(id);
        }, AUTO_CLOSE);
    }, [remove]);

    return (
        <AlertContext.Provider value={push}>
            {children}

            {mounted && containerRef.current && createPortal(
                <Box
                    position="fixed"
                    top={4}
                    right={4}
                    zIndex={9999}
                    maxW="420px"
                    w="calc(100% - 32px)"
                >
                    <VStack gap={3} align="stretch">
                        <AnimatePresence mode="popLayout">
                            {alerts.map(a => (
                                <motion.div
                                    key={a.id}
                                    layout
                                    initial={{ x: "100%", opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: "100%", opacity: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 40,
                                    }}
                                >
                                    <AppAlert
                                        status={a.status}
                                        title={a.title}
                                        message={a.message}
                                        onClose={() => remove(a.id)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </VStack>
                </Box>,
                containerRef.current
            )}
        </AlertContext.Provider>
    );
};