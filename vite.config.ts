import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isDebug = mode === 'debug'

  return {
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
      // 开发时代理 API 请求到 Go 后端
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
    // debug 模式：不压缩不混淆，生成内联 sourcemap，便于调试
    // 通过 `vite build --mode debug` 触发
    build: {
      outDir: 'dist',
      // 生产环境由 Go 服务器提供静态文件服务
      emptyOutDir: true,
      minify: isDebug ? false : 'esbuild',
      sourcemap: isDebug ? 'inline' : false,
      cssMinify: isDebug ? false : true,
    },
  }
})
