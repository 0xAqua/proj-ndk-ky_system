import { Button, type ButtonProps } from "@chakra-ui/react";
import React from "react";

type Props = ButtonProps & {
    onClick: () => void;
    children: React.ReactNode;
};

export const SubmitButton = ({ onClick, children, ...props }: Props) => {
    return (
        <Button
            // ── デザイン定義 ──
            bg="#34C759"
            color="white"
            _hover={{
                bg: "#2DB14B",
                boxShadow: "0 6px 20px rgba(52, 199, 89, 0.4)"
            }}
            _active={{ bg: "#25963F" }}

            // ── レイアウト・形状 ──
            w="full"
            py={6}             // 高さを出して押しやすく
            borderRadius="xl"  // カードに合わせた丸み
            boxShadow="0 4px 12px rgba(52, 199, 89, 0.3)"
            fontSize="md"
            fontWeight="bold"
            transition="all 0.2s"

            // ── 動作 ──
            onClick={onClick}

            {...props}
        >
            {children}
        </Button>
    );
};