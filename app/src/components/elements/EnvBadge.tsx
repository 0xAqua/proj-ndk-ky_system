// src/components/elements/EnvBadge.tsx
import { Badge } from "@chakra-ui/react";

type EnvConfig = { label: string; color: "green" | "purple" | "gray" };

const envConfigs: Record<string, EnvConfig> = {
    dev: { label: "DEVELOPMENT", color: "green" },
    sandbox: { label: "SANDBOX", color: "purple" },
};

export const EnvBadge = () => {
    const env = import.meta.env.VITE_APP_ENV;

    // 本番(prod)または環境変数が空の場合は何も出さない
    if (!env || env === "prod" || env === "production") return null;

    const config: EnvConfig = envConfigs[env] ?? {
        label: (env ?? "UNKNOWN").toUpperCase(),
        color: "gray"
    };

    const { label, color } = config;

    return (
        <Badge
            variant="solid"      // 塗りつぶしのシンプルなスタイル
            colorPalette={color} // green または purple
            size="sm"            // 少しコンパクトに
            px={2}
            borderRadius="sm"    // 少しだけ角を丸める
            fontWeight="bold"
            letterSpacing="tight"
        >
            {label}
        </Badge>
    );
};