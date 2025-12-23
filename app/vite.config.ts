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
                target: 'https://dva6z8o3zz0h8.cloudfront.net',
                changeOrigin: true,
                secure: true,
            },
        },
    },
})