import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
    // 環境変数を読み込む
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            proxy: {
                '/api/v1': {
                    target: env.VITE_CROUD_FRONT_URL,
                    changeOrigin: true,
                    secure: true,
                },
            },
        },
    }
})