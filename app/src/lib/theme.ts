import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const customConfig = defineConfig({
    globalCss: {
        body: {
            fontFamily: "'Noto Sans JP', sans-serif",
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #ffedd5 100%) fixed",
            minHeight: "100vh",
        },
    },
});

export const system = createSystem(defaultConfig, customConfig);