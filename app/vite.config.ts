import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// vite.config.js

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
                // 先ほど出力された api_endpoint_original を直接指定
                target: 'https://ptaion2deh.execute-api.ap-northeast-1.amazonaws.com',
                changeOrigin: true,
                secure: true,
                // CloudFrontを通さないので、ここではパスを書き換える（/api/v1 を消す）
                rewrite: (path) => path.replace(/^\/api\/v1/, ''),
            },
        },
    },
})