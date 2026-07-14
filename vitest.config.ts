import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 测试环境配置
    environment: 'jsdom',
    
    // 全局测试设置文件
    setupFiles: ['./src/test/setup.ts'],
    
    // 全局测试 API
    globals: true,
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/env.d.ts',
      ],
    },
    
    // 测试文件匹配模式
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    
    // 排除目录
    exclude: ['node_modules', 'dist', 'src-tauri'],
    
    // 测试超时时间
    testTimeout: 10000,
    
    // 钩子超时时间
    hookTimeout: 10000,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})