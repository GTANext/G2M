import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    VueRouter({
      routesFolder: 'src/pages',          // 指定页面目录
      extensions: ['.vue'],               // 文件扩展名
      dts: 'src/typed-router.d.ts',       // 路由类型声明文件
      routeBlockLang: 'yaml',             // <route> 块的语言
      importMode: 'async',                // 异步加载组件
      exclude: ['**/components/*.vue'],   // 排除components目录
    }),
    vue(),
    // 自动组件导入
    Components({
      dirs: ['src/components'],           // 自动注册components目录
      extensions: ['vue'],                 // 文件扩展名
      deep: true,                         // 深度扫描子目录
      dts: 'src/components.d.ts',         // 组件类型声明
      directoryAsNamespace: true,         // 使用目录名作为命名空间
      globalNamespaces: ['global'],       // 全局命名空间
    }),
    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,             // 自动导入vue-router的API
        {
          // 其他自定义自动导入
          '@vueuse/core': [
            'useMouse',
            'useFetch'
          ]
        }
      ],
      dts: 'src/auto-imports.d.ts',       // 自动导入类型声明
      dirs: [
        'src/composables',                // 自动导入composables目录
        'src/stores'                      // 自动导入stores目录
      ],
      vueTemplate: true                   // 在模板中自动导入
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./', import.meta.url)) // 根目录别名
    }
  },

  build: {
    rollupOptions: {
      external: (id: string) => {
        // 在Tauri环境中外部化Tauri API
        if (process.env.TAURI_PLATFORM) {
          return id.startsWith('@tauri-apps/');
        }
        return false;
      }
    }
  },

  optimizeDeps: {
    exclude: ['@tauri-apps/api']
  },

  define: {
    // 在Web环境中定义Tauri相关的全局变量
    '__TAURI__': 'undefined'
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
