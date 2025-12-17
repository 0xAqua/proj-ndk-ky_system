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

            backgroundColor: "#faf9f7",
            backgroundImage: `
            radial-gradient(ellipse at 100% 100%, rgba(191, 219, 254, 0.4) 0%, transparent 50%),
            linear-gradient(-45deg, #faf9f7, #f5f3ef, #faf5f0, #faf9f7)
        `,
            backgroundSize: "100% 100%, 400% 400%",
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