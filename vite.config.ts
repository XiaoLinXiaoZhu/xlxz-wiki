import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
  },
  server: {
    port: 5173,
    // 开发时代理 API 请求到 Hono 后端
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3055',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3055',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 生产环境由 Hono 提供静态文件服务
    emptyOutDir: true,
  },
})
