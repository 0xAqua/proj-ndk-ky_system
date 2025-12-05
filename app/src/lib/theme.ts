// src/lib/theme.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
    theme: {
        keyframes: {
            aurora: {
                "0%": { backgroundPosition: "0% 50%" },
                "50%": { backgroundPosition: "100% 50%" },
                "100%": { backgroundPosition: "0% 50%" },
            },
        },
    },

    globalCss: {
        body: {
            fontFamily: "'Noto Sans JP', sans-serif",
            minHeight: "100vh",
            color: "gray.800",

            backgroundImage: "linear-gradient(-45deg, #eff6ff, #dbeafe, #ffedd5, #eff6ff)",
            backgroundSize: "400% 400%",
            animation: "aurora 25s ease infinite",

            overflow: "auto",
            scrollbarWidth: "none",

            "&::-webkit-scrollbar": {
                display: "none",
            },
        },
    },
});

export const system = createSystem(defaultConfig, customConfig);