import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api/v1': {
                target: 'https://ptaion2deh.execute-api.ap-northeast-1.amazonaws.com',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api\/v1/, ''),
            },
        },
    },
})