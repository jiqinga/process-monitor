import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { resolve } from "path";

export default defineConfig(async () => ({
  plugins: [
    vue(),
    // 构建期预编译 i18n 消息为函数,避免生产环境依赖 new Function()
    // 在严格 CSP(无 unsafe-eval)下触发运行时消息编译器崩溃导致白屏
    VueI18nPlugin({
      include: [resolve(__dirname, "./src/locales/**/*.json")],
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
}));
