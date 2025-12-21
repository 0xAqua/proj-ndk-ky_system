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
                target: 'https://ucjr9phbdb.execute-api.ap-northeast-1.amazonaws.com/',
                changeOrigin: true,
                secure: true,
                // /api/v1/me -> /me に変換。targetと合体して /bff/me になる
                rewrite: (path) => path.replace(/^\/api\/v1/, ''),
            },
        },
    },
})